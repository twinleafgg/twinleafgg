import { PokemonCard, Stage, CardType, StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Furfrou extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Hand Trim',
    cost: [C],
    damage: 0,
    text: 'Discard random cards from your opponent\'s hand until they have 5 cards in their hand.'
  },
  {
    name: 'Headbutt',
    cost: [C],
    damage: 30,
    text: ''
  }];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '67';
  public name: string = 'Furfrou';
  public fullName: string = 'Furfrou M3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hand Cut - discard random cards until opponent has 5 cards
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Discard random cards until hand size is 5
      while (opponent.hand.cards.length > 5) {
        const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
        const randomCard = opponent.hand.cards[randomIndex];
        MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: [randomCard], sourceCard: this });
      }
    }

    return state;
  }
}
