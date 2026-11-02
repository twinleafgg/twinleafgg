import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Croagunk extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Astonish',
    cost: [C],
    damage: 0,
    text: 'Choose 1 card from your opponent\'s hand without looking. Look at that card you chose, then have your opponent shuffle that card into his or her deck.'
  }, {
    name: 'Punch',
    cost: [F, C],
    damage: 30,
    text: ''
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '61';
  public name: string = 'Croagunk';
  public fullName: string = 'Croagunk AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Astonish
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (opponent.hand.cards.length === 0) {
        return state;
      }
      const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
      const randomCard = opponent.hand.cards[randomIndex];
      SHOW_CARDS_TO_PLAYER(store, state, player, [randomCard]);
      MOVE_CARDS(store, state, opponent.hand, opponent.deck, {
        cards: [randomCard],
        sourceCard: this,
        sourceEffect: this.attacks[0],
      });
      SHUFFLE_DECK(store, state, opponent);
    }

    return state;
  }
}
