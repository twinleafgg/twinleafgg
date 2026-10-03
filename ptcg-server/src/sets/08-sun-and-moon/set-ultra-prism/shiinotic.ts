import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SpecialCondition, SuperType, BoardEffect } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, GameError, GameMessage, StateUtils, Card, ChooseCardsPrompt, ShuffleDeckPrompt, ShowCardsPrompt, PlayerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {IS_ABILITY_BLOCKED, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Shiinotic extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public cardType: CardType[] = [Y];
  public hp: number = 100;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C, C];
  public evolvesFrom: string = 'Morelull';

  public powers = [{
    name: 'Tasting',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may search your deck for a [Y] Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.'
  }];

  public attacks = [{
    name: 'Flickering Spores',
    cost: [Y, C],
    damage: 30,
    text: 'Your opponent\'s Active Pokémon is now Asleep.'
  }];

  public set: string = 'UPR';
  public name: string = 'Shiinotic';
  public fullName: string = 'Shiinotic UPR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '93';

  public readonly ILLUMINATE_MARKER = 'ILLUMINATE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.ILLUMINATE_MARKER)) {
      const player = effect.player;
      player.marker.removeMarker(this.ILLUMINATE_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check to see if anything is blocking our Ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      if (player.marker.hasMarker(this.ILLUMINATE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      let cards: Card[] = [];
      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.POKEMON, cardType: [Y] },
        { min: 0, max: 1, allowCancel: true }
      ), selected => {
        cards = selected || [];

        // Operation canceled by the user
        if (cards.length === 0) {
          return state;
        }

        player.marker.addMarker(this.ILLUMINATE_MARKER, this);

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });

        cards.forEach((card, index) => {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: [card], sourceCard: this });
        });

        if (cards.length > 0) {
          state = store.prompt(state, new ShowCardsPrompt(
            opponent.id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            cards
          ), () => {
          });
        }
        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const specialConditionEffect = new AddSpecialConditionsEffect(effect, [SpecialCondition.ASLEEP]);
      store.reduceEffect(state, specialConditionEffect);
    }

    return state;
  }
}