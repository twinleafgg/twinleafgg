import { PokemonCard, Stage, CardType, PowerType, State, StoreLike, StateUtils, ConfirmPrompt, GameMessage, ChooseCardsPrompt, SuperType, EnergyCard, EnergyType, GameError } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MovedFromActiveToBenchEffect, PowerEffect } from '../../../game/store/effects/game-effects';
import {DISCARD_ALL_ENERGY_FROM_POKEMON, MOVED_FROM_ACTIVE_TO_BENCH_THIS_TURN, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Clawitizer extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Clauncher';
  public cardType: CardType[] = [W];
  public hp: number = 130;
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public powers = [{
    name: 'Reverse and Reload',
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, when this Pokémon moves from the Active Spot to the Bench, you may use this Ability. Attach up to 2 Basic [W] Energy cards from your hand to this Pokémon.'
  }];

  public attacks = [{
    name: 'Aqua Launcher',
    cost: [W, W, W],
    damage: 210,
    text: 'Discard all Energy from this Pokémon.'
  }];

  public set: string = 'MEG';
  public setNumber: string = '38';
  public regulationMark = 'I';
  public cardImage: string = 'assets/cardback.png';
  public fullName: string = 'Clawitizer M1S';
  public name: string = 'Clawitizer';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);

    const player = state.players[state.activePlayer];
    if (
      effect instanceof MovedFromActiveToBenchEffect &&
      effect.pokemonCard === this &&
      state.players[state.activePlayer] === effect.player &&
      MOVED_FROM_ACTIVE_TO_BENCH_THIS_TURN(effect.player, this)
    ) {
      if (player.marker.hasMarker(this.ABILITY_USED_MARKER, this)) {
        return state;
      }

      try {
        const stub = new PowerEffect(player, {
          name: 'test',
          powerType: PowerType.ABILITY,
          text: ''
        }, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      const energyCards = player.hand.cards.filter(c => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC && c.name === 'Water Energy');
      if (energyCards.length === 0) {
        return state;
      }

      state = store.prompt(state, new ConfirmPrompt(
        player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (!wantToUse) {
          player.marker.addMarker(this.ABILITY_USED_MARKER, this);
          return;
        }

        const hasEnergyInHand = player.hand.cards.some(c => {
          return c.superType === SuperType.ENERGY
            && c.energyType === EnergyType.BASIC
            && (c as EnergyCard).provides.includes(CardType.WATER);
        });
        if (!hasEnergyInHand) {
          throw new GameError(GameMessage.CANNOT_USE_POWER);
        }

        const cardList = StateUtils.findCardList(state, this);

        player.marker.addMarker(this.ABILITY_USED_MARKER, this);

        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_ATTACH,
          player.hand,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Water Energy' },
          { min: 0, max: 2, allowCancel: false }
        ), cards => {
          cards = cards || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.hand, cardList, { cards: cards, sourceCard: this });
          }
        });
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_ALL_ENERGY_FROM_POKEMON(store, state, effect, this);
    }

    return state;
  }
}
