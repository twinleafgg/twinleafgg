import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Swoobat extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Woobat';
  public cardType: CardType[] = [P];
  public hp: number = 80;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Gust',
    cost: [C, C],
    damage: 20,
    text: ''
  }, {
    name: 'Heart Stamp',
    cost: [P, C, C],
    damage: 60,
    text: 'Flip a coin. If heads, your opponent shuffles his or her hand into his or her deck.'
  }];

  public set: string = 'BLW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '51';
  public name: string = 'Swoobat';
  public fullName: string = 'Swoobat BLW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          // Shuffle opponent's hand into deck
          MOVE_CARDS(store, state, opponent.hand, opponent.deck, { sourceCard: this });
          SHUFFLE_DECK(store, state, opponent);
        }
      });
    }
    return state;
  }
}
