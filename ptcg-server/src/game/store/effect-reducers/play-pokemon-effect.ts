import { PlayPokemonEffect } from '../effects/play-card-effects';
import { GameError } from '../../game-error';
import { GameMessage, GameLog } from '../../game-message';
import { Effect } from '../effects/effect';
import { BoardEffect, Stage } from '../card/card-types';
import { State } from '../state/state';
import { StoreLike } from '../store-like';
import { CheckPokemonPlayedTurnEffect, CheckSpecialConditionRemovalEffect } from '../effects/check-effects';
import { EvolveEffect } from '../effects/game-effects';
import { PowerType } from '../card/pokemon-types';

/**
 * Helper function to emit animation events
 * @param store - The store instance
 * @param eventName - The name of the animation event
 * @param data - The data to send with the event
 */
function emitAnimationEvent(store: StoreLike, eventName: string, data: {
  playerId: number;
  cardId: number | string;
  slot?: string;
  index?: number;
}): void {
  const game = (store as any).handler;
  if (game && game.core && typeof game.core.emit === 'function') {
    game.core.emit((c: any) => {
      if (typeof c.socket !== 'undefined') {
        c.socket.emit(`game[${game.id}]:${eventName}`, data);
      }
    });
  }
}

export function playPokemonReducer(store: StoreLike, state: State, effect: Effect): State {

  /* Play pokemon card */
  if (effect instanceof PlayPokemonEffect) {
    if (effect.player.cannotPlayPokemonCards) {
      throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
    }
    if (effect.player.cannotPlayPokemonWithAbilities
      && effect.pokemonCard.powers.some(power => power.powerType === PowerType.ABILITY)) {
      throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
    }
    const stage = effect.pokemonCard.stage;
    const sandboxAllBasic = Boolean(state.gameSettings?.sandboxMode && state.gameSettings?.sandboxAllPokemonBasic);
    const isBasic = stage === Stage.BASIC || sandboxAllBasic;

    if (isBasic && effect.target.cards.length === 0) {
      clearUntilLeavesPlay(effect.pokemonCard);
      store.log(state, GameLog.LOG_PLAYER_PLAYS_BASIC_POKEMON, {
        name: effect.player.name,
        card: effect.pokemonCard.name
      });
      effect.player.hand.moveCardTo(effect.pokemonCard, effect.target);
      effect.target.pokemonPlayedTurn = state.turn;

      // Emit basic animation event
      emitAnimationEvent(store, 'playBasicAnimation', {
        playerId: effect.player.id,
        cardId: effect.pokemonCard.id,
        slot: effect.slot ? String(effect.slot) : undefined,
        index: effect.index
      });

      return state;
    }
    const player = effect.player;
    const isEvolved = stage === Stage.STAGE_1 || Stage.STAGE_2;
    const evolvesFrom = effect.pokemonCard.evolvesFrom;
    const pokemonCard = effect.target.getPokemonCard();
    if (pokemonCard === undefined) {
      throw new GameError(GameMessage.INVALID_TARGET);
    }

    // Check if evolution is valid using either evolvesFrom, evolvesTo, evolvesToStage, or evolvesFromBase
    const isValidEvolution = (isEvolved && pokemonCard.stage < stage && pokemonCard.name === evolvesFrom) ||
      (isEvolved && pokemonCard.evolvesTo.includes(effect.pokemonCard.name)) ||
      (isEvolved && pokemonCard.evolvesToStage.includes(effect.pokemonCard.stage)) ||
      (isEvolved && Array.isArray(pokemonCard.evolvesFromBase) && pokemonCard.evolvesFromBase.length > 0 && pokemonCard.evolvesFromBase.includes(effect.pokemonCard.evolvesFrom));

    if (isValidEvolution) {
      if (player.cannotEvolvePokemonCards || effect.target.cannotEvolveNextTurn) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      const playedTurnEffect = new CheckPokemonPlayedTurnEffect(effect.player, effect.target);
      store.reduceEffect(state, playedTurnEffect);

      if (state.turn == 0 && player.canEvolve === false) {
        throw new GameError(GameMessage.CANNOT_EVOLVE_ON_YOUR_FIRST_TURN);
      }

      if (state.turn == 1 && player.canEvolve === false) {
        throw new GameError(GameMessage.CANNOT_EVOLVE_ON_YOUR_FIRST_TURN);
      }
      if (state.turn == 2 && player.canEvolve === false) {
        throw new GameError(GameMessage.CANNOT_EVOLVE_ON_YOUR_FIRST_TURN);
      }

      if (playedTurnEffect.pokemonPlayedTurn >= state.turn && !effect.target.canEvolveThisTurn) {
        throw new GameError(GameMessage.POKEMON_CANT_EVOLVE_THIS_TURN);
      }

      const evolveEffect = new EvolveEffect(effect.player, effect.target, effect.pokemonCard);
      store.reduceEffect(state, evolveEffect);
      clearUntilLeavesPlay(effect.pokemonCard);
      effect.pokemonCard.marker.markers = [];

      // Check which special conditions should be preserved during evolution
      const checkRemovalEffect = new CheckSpecialConditionRemovalEffect(effect.player, effect.target);
      store.reduceEffect(state, checkRemovalEffect);
      effect.target._preservedConditionsDuringEvolution = checkRemovalEffect.preservedConditions;

      effect.player.removePokemonEffects(effect.target);

      // Clear the preserved conditions after evolution is complete
      effect.target._preservedConditionsDuringEvolution = undefined;

      effect.target.marker.markers = [];
      effect.target.showBasicAnimation = false;
      effect.target.triggerEvolutionAnimation = true;

      if (effect.target.boardEffect.includes(BoardEffect.ABILITY_USED)) {
        effect.target.removeBoardEffect(BoardEffect.ABILITY_USED);
      }

      // Emit evolution animation event
      emitAnimationEvent(store, 'evolution', {
        playerId: effect.player.id,
        cardId: effect.pokemonCard.id,
        slot: effect.slot ? String(effect.slot) : undefined,
        index: effect.index
      });

      return state;
    }

    throw new GameError(GameMessage.INVALID_TARGET);
  }

  return state;
}

function clearUntilLeavesPlay(card: { cannotUseAttackUntilLeavesPlay?: string; whileInPlayOpponentWeakness?: unknown }): void {
  card.cannotUseAttackUntilLeavesPlay = undefined;
  card.whileInPlayOpponentWeakness = undefined;
}
