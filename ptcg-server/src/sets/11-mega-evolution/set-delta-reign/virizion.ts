import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AFTER_ATTACK, DRAW_CARDS } from '../../../game/store/prefabs/prefabs';

export class Virizion extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 120;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Double Draw',
    cost: [C],
    damage: 0,
    text: 'Draw 2 cards.'
  },
  {
    name: 'Solar Beam',
    cost: [G, G, C],
    damage: 110,
    text: ''
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '9';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Virizion';
  public fullName: string = 'Virizion MEM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Double Draw
    if (AFTER_ATTACK(effect, 0, this)) {
      DRAW_CARDS(store, state, effect.player, 2);
    }

    return state;
  }
}
