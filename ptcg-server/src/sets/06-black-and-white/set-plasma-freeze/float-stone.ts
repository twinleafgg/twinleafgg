import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class FloatStone extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'PLF';

  public name: string = 'Float Stone';

  public fullName: string = 'Float Stone PLF';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '99';

  public text: string = 'The Pokemon this card is attached to has no Retreat Cost.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckRetreatCostEffect && effect.player.active.tools.includes(this)) {
      const index = effect.cost.indexOf(CardType.COLORLESS);
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }
      if (index !== -1) {
        effect.cost.splice(index, 99);
      }
    }
    return state;
  }
}
