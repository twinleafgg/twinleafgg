import {
  Action, AttackAction, Card, EnergyCard, PassTurnAction, Player, PlayerType,
  PlayCardAction, PokemonCard, RetreatAction, SlotType, SpecialCondition, Stage,
  State, StateUtils, TrainerCard, TrainerType, UseAbilityAction, UseStadiumAction
} from '../game';
import { getCardTarget } from '../simple-bot/simple-tactics/simple-tactics';

const MAX_CANDIDATES_PER_TYPE = 8;

/**
 * Enumerate legal-ish player-turn actions for search.
 * Validity is confirmed by Simulator in ActionSearchAi.
 */
export class ActionEnumerator {

  public enumerate(state: State, player: Player, clientId: number): Action[] {
    const actions: Action[] = [];

    actions.push(...this.evolveActions(state, player));
    actions.push(...this.playBasicActions(state, player));
    actions.push(...this.attachEnergyActions(state, player));
    actions.push(...this.attachToolActions(state, player));
    actions.push(...this.discardAbilityActions(state, player));
    actions.push(...this.playItemActions(state, player));
    actions.push(...this.playStadiumActions(state, player));
    actions.push(...this.playSupporterActions(state, player));
    actions.push(...this.abilityActions(state, player));
    actions.push(...this.useStadiumActions(state, player));
    actions.push(...this.retreatActions(state, player));
    actions.push(...this.attackActions(state, player));
    actions.push(new PassTurnAction(clientId));

    return actions;
  }

  private evolveActions(state: State, player: Player): Action[] {
    const actions: Action[] = [];
    const pokemons: { card: PokemonCard; target: ReturnType<typeof getCardTarget> }[] = [];

    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
      if (cardList.pokemonPlayedTurn !== state.turn) {
        pokemons.push({ card, target });
      }
    });

    for (const p of pokemons) {
      for (let i = 0; i < player.hand.cards.length; i++) {
        const c = player.hand.cards[i];
        if (c instanceof PokemonCard && c.evolvesFrom === p.card.name) {
          actions.push(new PlayCardAction(player.id, i, p.target));
          if (actions.length >= MAX_CANDIDATES_PER_TYPE) {
            return actions;
          }
        }
      }
    }
    return actions;
  }

  private playBasicActions(state: State, player: Player): Action[] {
    const actions: Action[] = [];
    const emptySlots = player.bench.filter(b => b.cards.length === 0);
    if (emptySlots.length === 0) {
      return actions;
    }

    for (let i = 0; i < player.hand.cards.length; i++) {
      const c = player.hand.cards[i];
      if (c instanceof PokemonCard && c.stage === Stage.BASIC) {
        actions.push(new PlayCardAction(
          player.id,
          i,
          getCardTarget(player, state, emptySlots[0])
        ));
        if (actions.length >= MAX_CANDIDATES_PER_TYPE) {
          break;
        }
      }
    }
    return actions;
  }

  private attachEnergyActions(state: State, player: Player): Action[] {
    const actions: Action[] = [];
    if (player.energyPlayedTurn >= state.turn) {
      return actions;
    }

    const energyIndexes: number[] = [];
    const seen = new Set<string>();
    player.hand.cards.forEach((c, i) => {
      if (c instanceof EnergyCard && !seen.has(c.fullName)) {
        seen.add(c.fullName);
        energyIndexes.push(i);
      }
    });

    for (const index of energyIndexes) {
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        actions.push(new PlayCardAction(player.id, index, target));
      });
      if (actions.length >= MAX_CANDIDATES_PER_TYPE) {
        break;
      }
    }
    return actions.slice(0, MAX_CANDIDATES_PER_TYPE);
  }

  private attachToolActions(state: State, player: Player): Action[] {
    const actions: Action[] = [];
    for (let i = 0; i < player.hand.cards.length; i++) {
      const c = player.hand.cards[i];
      if (!(c instanceof TrainerCard) || c.trainerType !== TrainerType.TOOL) {
        continue;
      }
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList.tools.length === 0) {
          actions.push(new PlayCardAction(player.id, i, target));
        }
      });
      if (actions.length >= MAX_CANDIDATES_PER_TYPE) {
        break;
      }
    }
    return actions.slice(0, MAX_CANDIDATES_PER_TYPE);
  }

  private discardAbilityActions(state: State, player: Player): Action[] {
    const actions: Action[] = [];
    player.discard.cards.forEach((card, index) => {
      if (!(card instanceof PokemonCard)) {
        return;
      }
      const target = {
        player: PlayerType.BOTTOM_PLAYER,
        slot: SlotType.DISCARD,
        index
      };
      for (const power of card.powers) {
        if (power.useFromDiscard) {
          actions.push(new UseAbilityAction(player.id, power.name, target));
        }
      }
    });
    return actions.slice(0, MAX_CANDIDATES_PER_TYPE);
  }

  private playItemActions(state: State, player: Player): Action[] {
    const actions: Action[] = [];
    const target = { player: PlayerType.ANY, slot: SlotType.BOARD, index: 0 };
    for (let i = 0; i < player.hand.cards.length; i++) {
      const c = player.hand.cards[i];
      if (c instanceof TrainerCard && c.trainerType === TrainerType.ITEM) {
        actions.push(new PlayCardAction(player.id, i, target));
        if (actions.length >= MAX_CANDIDATES_PER_TYPE) {
          break;
        }
      }
    }
    return actions;
  }

  private playStadiumActions(state: State, player: Player): Action[] {
    const actions: Action[] = [];
    if (player.stadiumPlayedTurn >= state.turn || player.stadium.cards.length > 0) {
      return actions;
    }

    let stadiums: { card: Card; index: number }[] = [];
    player.hand.cards.forEach((c, i) => {
      if (c instanceof TrainerCard && c.trainerType === TrainerType.STADIUM) {
        stadiums.push({ card: c, index: i });
      }
    });

    const currentStadium = StateUtils.getStadiumCard(state);
    if (currentStadium) {
      stadiums = stadiums.filter(s => s.card.fullName !== currentStadium.fullName);
    }

    const target = { player: PlayerType.ANY, slot: SlotType.BOARD, index: 0 };
    for (const s of stadiums) {
      actions.push(new PlayCardAction(player.id, s.index, target));
    }
    return actions;
  }

  private playSupporterActions(state: State, player: Player): Action[] {
    const actions: Action[] = [];
    if (player.supporter.cards.length > 0 || player.supporterTurn >= state.turn) {
      return actions;
    }

    const target = { player: PlayerType.ANY, slot: SlotType.BOARD, index: 0 };
    for (let i = 0; i < player.hand.cards.length; i++) {
      const c = player.hand.cards[i];
      if (c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER) {
        actions.push(new PlayCardAction(player.id, i, target));
        if (actions.length >= MAX_CANDIDATES_PER_TYPE) {
          break;
        }
      }
    }
    return actions;
  }

  private abilityActions(state: State, player: Player): Action[] {
    const actions: Action[] = [];
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
      for (const power of card.powers) {
        if (power.useWhenInPlay) {
          actions.push(new UseAbilityAction(player.id, power.name, target));
        }
      }
    });
    return actions.slice(0, MAX_CANDIDATES_PER_TYPE);
  }

  private useStadiumActions(state: State, player: Player): Action[] {
    if (player.stadiumUsedTurn >= state.turn) {
      return [];
    }
    if (StateUtils.getStadiumCard(state) === undefined) {
      return [];
    }
    return [new UseStadiumAction(player.id)];
  }

  private retreatActions(state: State, player: Player): Action[] {
    const actions: Action[] = [];
    if (player.retreatedTurn === state.turn) {
      return actions;
    }
    player.bench.forEach((bench, index) => {
      if (bench.cards.length > 0) {
        actions.push(new RetreatAction(player.id, index));
      }
    });
    return actions;
  }

  private attackActions(state: State, player: Player): Action[] {
    const sp = player.active.specialConditions;
    if (sp.includes(SpecialCondition.PARALYZED) || sp.includes(SpecialCondition.ASLEEP)) {
      return [];
    }
    const active = player.active.getPokemonCard();
    if (!active) {
      return [];
    }
    return active.attacks.map(a => new AttackAction(player.id, a.name));
  }

}
