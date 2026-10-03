import { ChooseEnergyPrompt } from '../prompts/choose-energy-prompt';
import { ChoosePokemonPrompt } from '../prompts/choose-pokemon-prompt';
import { GameError } from '../../game-error';
import { GameMessage, GameLog } from '../../game-message';
import { Effect } from '../effects/effect';
import { State } from '../state/state';
import { StoreLike } from '../store-like';
import { RetreatEffect, RetreatStartEffect } from '../effects/game-effects';
import { StateUtils } from '../state-utils';
import { CheckRetreatCostEffect, CheckProvidedEnergyEffect } from '../effects/check-effects';
import { SpecialCondition } from '../card/card-types';
import { Player } from '../state/player';
import { PlayerType, SlotType } from '../actions/play-card-action';
import { PokemonCardList } from '../state/pokemon-card-list';

function assertCanRetreat(player: Player, state: State): void {
  const active = player.active;
  const sourceCard = active.cannotRetreatWhileActiveSourceCard;
  const opponent = StateUtils.getOpponent(state, player);

  if (sourceCard && opponent.active.getPokemonCard() !== sourceCard) {
    active.cannotRetreatWhileActive = false;
    active.cannotRetreatWhileActiveSourceCard = undefined;
  }

  if (active.cannotRetreatNextTurn || active.cannotRetreatWhileActive) {
    throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
  }
}

function retreatPokemon(store: StoreLike, state: State, effect: RetreatEffect) {
  const player = effect.player;
  const activePokemon = player.active.getPokemonCard();
  const benchedPokemon = player.bench[effect.benchIndex].getPokemonCard();
  if (activePokemon === undefined || benchedPokemon === undefined) {
    return;
  }

  store.log(state, GameLog.LOG_PLAYER_RETREATS, {
    name: player.name,
    active: activePokemon.name,
    benched: benchedPokemon.name
  });

  player.retreatedTurn = state.turn;
  player.switchPokemon(player.bench[effect.benchIndex], store, state);
}

function flatMap<T, U>(array: T[], fn: (item: T) => U[]): U[] {
  return array.reduce((acc, item) => acc.concat(fn(item)), [] as U[]);
}

function promptBenchAndRetreat(store: StoreLike, state: State, player: Player): State {
  const prompt = new ChoosePokemonPrompt(
    player.id,
    GameMessage.CHOOSE_POKEMON_TO_SWITCH,
    PlayerType.BOTTOM_PLAYER,
    [SlotType.BENCH],
    { min: 1, max: 1, allowCancel: true, blocked: [] }
  );
  prompt.skipSwitchLog = true;
  return store.prompt(state, prompt, (benchResult: PokemonCardList[] | null) => {
    if (benchResult === null) {
      return;
    }
    const benchIndex = player.bench.indexOf(benchResult[0]);
    if (benchIndex < 0) {
      return;
    }
    retreatPokemon(store, state, new RetreatEffect(player, benchIndex));
  });
}

export function retreatReducer(store: StoreLike, state: State, effect: Effect): State {

  /* Retreat start: validate + pay cost, then prompt for bench */
  if (effect instanceof RetreatStartEffect) {
    const player = effect.player;

    assertCanRetreat(player, state);

    const hasBenchPokemon = player.bench.some(b => b.cards.length > 0);
    if (!hasBenchPokemon) {
      throw new GameError(GameMessage.INVALID_TARGET);
    }

    const sp = player.active.specialConditions;
    if (sp.includes(SpecialCondition.PARALYZED) || sp.includes(SpecialCondition.ASLEEP)) {
      throw new GameError(GameMessage.BLOCKED_BY_SPECIAL_CONDITION);
    }

    if (player.retreatedTurn === state.turn) {
      throw new GameError(GameMessage.RETREAT_ALREADY_USED);
    }

    const checkRetreatCost = new CheckRetreatCostEffect(player);
    state = store.reduceEffect(state, checkRetreatCost);

    if (checkRetreatCost.cost.length === 0) {
      player.active.clearEffects();
      return promptBenchAndRetreat(store, state, player);
    }

    const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
    state = store.reduceEffect(state, checkProvidedEnergy);

    const enoughEnergies = StateUtils.checkEnoughEnergy(checkProvidedEnergy.energyMap, checkRetreatCost.cost);
    if (enoughEnergies === false) {
      throw new GameError(GameMessage.NOT_ENOUGH_ENERGY);
    }

    if (StateUtils.checkExactEnergy(checkProvidedEnergy.energyMap, checkRetreatCost.cost)) {
      const cards = flatMap(checkProvidedEnergy.energyMap, e => Array.from({ length: StateUtils.getProvidesUnitCount(e.provides) }, () => e.card));
      player.active.clearEffects();
      player.active.moveCardsTo(cards, player.discard);
      return promptBenchAndRetreat(store, state, player);
    }

    if (StateUtils.allEnergyProvidesIdentical(checkProvidedEnergy.energyMap)) {
      const selection = StateUtils.selectMinimalEnergyForCost(
        checkProvidedEnergy.energyMap, checkRetreatCost.cost
      );
      if (selection && selection.length > 0) {
        const cards = selection.map(e => e.card);
        player.active.clearEffects();
        player.active.moveCardsTo(cards, player.discard);
        return promptBenchAndRetreat(store, state, player);
      }
    }

    return store.prompt(state, new ChooseEnergyPrompt(
      player.id,
      GameMessage.CHOOSE_ENERGY_TO_PAY_RETREAT_COST,
      checkProvidedEnergy.energyMap,
      checkRetreatCost.cost
    ), energy => {
      if (energy === null) {
        return;
      }
      const cards = energy.map(e => e.card);
      player.active.clearEffects();
      player.active.moveCardsTo(cards, player.discard);
      promptBenchAndRetreat(store, state, player);
    });
  }

  /* Retreat pokemon */
  if (effect instanceof RetreatEffect) {
    const player = effect.player;

    assertCanRetreat(player, state);

    if (player.bench[effect.benchIndex].cards.length === 0) {
      throw new GameError(GameMessage.INVALID_TARGET);
    }

    const sp = player.active.specialConditions;
    if ((sp.includes(SpecialCondition.PARALYZED) || sp.includes(SpecialCondition.ASLEEP)) && !effect.ignoreStatusConditions) {
      throw new GameError(GameMessage.BLOCKED_BY_SPECIAL_CONDITION);
    }

    if (player.retreatedTurn === state.turn) {
      throw new GameError(GameMessage.RETREAT_ALREADY_USED);
    }

    const checkRetreatCost = new CheckRetreatCostEffect(effect.player);
    state = store.reduceEffect(state, checkRetreatCost);

    if (checkRetreatCost.cost.length === 0) {
      player.active.clearEffects();
      retreatPokemon(store, state, effect);
      return state;
    }

    const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
    state = store.reduceEffect(state, checkProvidedEnergy);

    const enoughEnergies = StateUtils.checkEnoughEnergy(checkProvidedEnergy.energyMap, checkRetreatCost.cost);
    if (enoughEnergies === false) {
      throw new GameError(GameMessage.NOT_ENOUGH_ENERGY);
    }

    // If the player has the exact energy cost, automatically discard the energy and retreat
    if (StateUtils.checkExactEnergy(checkProvidedEnergy.energyMap, checkRetreatCost.cost)) {
      const cards = flatMap(checkProvidedEnergy.energyMap, e => Array.from({ length: StateUtils.getProvidesUnitCount(e.provides) }, () => e.card));
      player.active.clearEffects();
      player.active.moveCardsTo(cards, effect.moveRetreatCostTo);
      retreatPokemon(store, state, effect);
      return state;
    }

    // If all attached energy is identical, no meaningful choice - auto-select minimal and retreat
    if (StateUtils.allEnergyProvidesIdentical(checkProvidedEnergy.energyMap)) {
      const selection = StateUtils.selectMinimalEnergyForCost(
        checkProvidedEnergy.energyMap, checkRetreatCost.cost
      );
      if (selection && selection.length > 0) {
        const cards = selection.map(e => e.card);
        player.active.clearEffects();
        player.active.moveCardsTo(cards, effect.moveRetreatCostTo);
        retreatPokemon(store, state, effect);
        return state;
      }
    }

    return store.prompt(state, new ChooseEnergyPrompt(
      player.id,
      GameMessage.CHOOSE_ENERGY_TO_PAY_RETREAT_COST,
      checkProvidedEnergy.energyMap,
      checkRetreatCost.cost
    ), energy => {
      if (energy === null) {
        return; // operation cancelled
      }
      const activePokemon = player.active.getPokemonCard();
      const benchedPokemon = player.bench[effect.benchIndex].getPokemonCard();
      if (activePokemon === undefined || benchedPokemon === undefined) {
        return;
      }


      const cards = energy.map(e => e.card);
      player.active.clearEffects();
      player.active.moveCardsTo(cards, effect.moveRetreatCostTo);
      retreatPokemon(store, state, effect);
    });
  }

  return state;
}
