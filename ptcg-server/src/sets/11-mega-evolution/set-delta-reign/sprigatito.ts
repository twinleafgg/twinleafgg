import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';

export class Sprigatito extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 70;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Play Rough',
    cost: [G],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 more damage.'
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '12';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Sprigatito';
  public fullName: string = 'Sprigatito MEM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Play Rough
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 20);
    }

    return state;
  }
}
