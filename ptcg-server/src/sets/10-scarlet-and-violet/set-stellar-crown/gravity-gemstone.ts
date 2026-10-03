import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { StateUtils } from '../../../game';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class GravityGemstone extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public regulationMark = 'H';

  public setNumber = '137';

  public set: string = 'SCR';

  public name: string = 'Gravity Gemstone';

  public fullName: string = 'Gravity Gemstone SCR';

  public cardImage: string = 'assets/cardback.png';

  public text: string =
    'As long as the Pokémon this card is attached to is in the Active Spot, the Retreat Cost of both Active Pokémon is [C] more.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckRetreatCostEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        return state;
      }

      if (player.active.tools.includes(this) || opponent.active.tools.includes(this)) {
        effect.cost.push(CardType.COLORLESS);
      }
    }

    return state;
  }
}
