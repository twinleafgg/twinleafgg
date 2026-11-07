import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';

export class Pawmi extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 60;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Quick Attack',
    cost: [L],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 more damage.'
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '37';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Pawmi';
  public fullName: string = 'Pawmi MEE';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Quick Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 20);
    }

    return state;
  }
}
