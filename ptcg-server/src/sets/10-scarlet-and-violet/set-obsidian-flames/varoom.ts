import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Varoom extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public regulationMark = 'G';
  public cardType: CardType[] = [CardType.METAL];
  public hp: number = 60;
  public weakness = [{ type: CardType.FIRE }];
  public resistance = [{ type: CardType.GRASS, value: -30 }];
  public retreat = [CardType.COLORLESS];

  public attacks = [{
    name: 'Spinning Draw',
    cost: [CardType.METAL],
    damage: 10,
    text: 'Draw a card.'
  }];

  public set: string = 'OBF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '154';
  public name: string = 'Varoom';
  public fullName: string = 'Varoom OBF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
    }
    return state;
  }
}