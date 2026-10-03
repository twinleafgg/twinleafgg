import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TOOL_ACTIVE_DAMAGE_BONUS } from '../../../game/store/prefabs/tool-prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class MuscleBand extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'XY';

  public name: string = 'Muscle Band';

  public fullName: string = 'Muscle Band XY';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '121';

  public text: string =
    'The attacks of the Pokemon this card is attached to do 20 more ' +
    "damage to our opponent's Active Pokemon (before aplying Weakness " +
    'and Resistance).';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ref: prefabs/prefabs.ts (TOOL_ACTIVE_DAMAGE_BONUS) — uses effect.damage, not printed attack.damage
    TOOL_ACTIVE_DAMAGE_BONUS(store, state, effect, this, { damageBonus: 20 });
    return state;
  }
}
