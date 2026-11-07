import { CardType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { AFTER_ATTACK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Inkay extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [D];
  public hp: number = 60;
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Knock Off',
    cost: [D],
    damage: 10,
    text: 'Discard a random card from your opponent\'s hand.',
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '68';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Inkay';
  public fullName: string = 'Inkay M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Knock Off
    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.hand.cards.length > 0) {
        const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
        const randomCard = opponent.hand.cards[randomIndex];
        MOVE_CARDS(store, state, opponent.hand, opponent.discard, {
          cards: [randomCard],
          sourceCard: this,
          sourceEffect: this.attacks[0],
        });
      }
    }

    return state;
  }
}
