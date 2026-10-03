import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Meltan extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public evolvesFrom: string = 'Meltan';
  public cardType: CardType[] = [M];
  public hp: number = 70;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Knickknack Carrying',
    cost: [M],
    damage: 0,
    text: 'Search your deck for a Pokémon Tool card, reveal it, and put it into your hand. Then, shuffle your deck.'
  },
  {
    name: 'Ram',
    cost: [M, C],
    damage: 30,
    text: ''
  }];

  public set: string = 'SCR';
  public regulationMark: string = 'H';
  public setNumber: string = '103';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Meltan';
  public fullName: string = 'Meltan SCR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        return state;
      } else {

        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.TRAINER, trainerType: TrainerType.TOOL },
          { min: 0, max: 1, allowCancel: true }
        ), selectedCards => {
          const cards = selectedCards || [];

          // Operation canceled by the user
          if (cards.length === 0) {
            return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
              player.deck.applyOrder(order);
              return state;
            });
          }

          cards.forEach((card, index) => {
            MOVE_CARDS(store, state, player.deck, player.hand, { cards: [card], sourceCard: this });
          });

          if (cards.length > 0) {
            SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
          }

          SHUFFLE_DECK(store, state, player);
        });
      }
    }
    return state;
  }
}