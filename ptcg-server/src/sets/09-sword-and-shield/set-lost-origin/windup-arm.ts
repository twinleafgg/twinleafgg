import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { UseAttackEffect } from '../../../game/store/effects/game-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class WindupArm extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public regulationMark: string = 'F';
  public set: string = 'LOR';
  public setNumber: string = '170';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Windup Arm';
  public fullName: string = 'Windup Arm LOR 170';
  public text: string =
    "The Pokémon this card is attached to can attack even if it's Asleep or Paralyzed.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ref: set-ultra-prism/escape-board.ts (ignore Asleep/Paralyzed for retreat)
    if (effect instanceof UseAttackEffect && effect.player.active.tools.includes(this)) {
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }
      effect.ignoreStatusConditions = true;
    }

    return state;
  }
}
