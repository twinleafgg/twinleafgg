import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Purrloin extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [D];
  public hp: number = 60;
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Knock Off',
    cost: [D, C],
    damage: 20,
    text: 'Flip a coin. If heads, discard a random card from your opponent\'s hand.'
  }];

  public set: string = 'EPO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '64';
  public name: string = 'Purrloin';
  public fullName: string = 'Purrloin EPO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result && opponent.hand.cards.length > 0) {
          const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
          const cardToDiscard = opponent.hand.cards[randomIndex];
          MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: [cardToDiscard], sourceCard: this });
        }
      });
    }
    return state;
  }
}
