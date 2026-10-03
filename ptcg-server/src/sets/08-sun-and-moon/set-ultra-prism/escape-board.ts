import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { RetreatEffect } from '../../../game/store/effects/game-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class EscapeBoard extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'UPR';

  public name: string = 'Escape Board';

  public fullName: string = 'Escape Board UPR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '122';

  public text: string =
    "The Retreat Cost of the Pokémon this card is attached to is [C] less, and it can retreat even if it's Asleep or Paralyzed.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckRetreatCostEffect && effect.player.active.tools.includes(this)) {
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (effect.cost.length === 0) {
        effect.cost = [];
      } else {
        effect.cost.splice(0, 1);
      }
    }

    if (effect instanceof RetreatEffect && effect.player.active.tools.includes(this)) {
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      effect.ignoreStatusConditions = true;
      effect.player.active.clearEffects();
    }

    return state;
  }
}
