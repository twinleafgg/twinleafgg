import { State, StoreLike, TrainerCard, TrainerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ApplyWeaknessEffect } from '../../../game/store/effects/attack-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class SupereffectiveGlasses extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'ASR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '152';

  public regulationMark = 'F';

  public name: string = 'Supereffective Glasses';

  public fullName: string = 'Supereffective Glasses ASR';

  public text: string =
    "When applying Weakness to damage from the attacks of the Pokémon this card is attached to done to your opponent's Active Pokémon, apply it as ×3.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof ApplyWeaknessEffect && effect.source.tools.includes(this)) {
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      effect.damage = effect.damage * 1.5;
    }

    return state;
  }
}
