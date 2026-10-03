import { PokemonCard } from '../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../game/store/card/card-types';
import { Attack } from '../../game/store/card/pokemon-types';

import { Effect } from '../../game/store/effects/effect';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class Meowth extends PokemonCard {
  public name = 'Meowth';
  public cardImage: string = 'assets/cardback.png';
  public set = 'JU';
  public setNumber = '56';
  public fullName = 'Meowth JU';

  public cardType: CardType[] = [C];
  public stage = Stage.BASIC;
  public hp = 50;
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -30 }];
  public retreat = [C];

  public attacks: Attack[] = [
    {
      name: 'Pay Day',
      cost: [C, C],
      damage: 10,
      damageCalculation: 'x',
      text: 'Flip a coin. If heads, draw a card.'
    }
  ];

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return COIN_FLIP_PROMPT(store, state, effect.player, (results) => {
        MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
      });
    }

    return state;
  }

}
