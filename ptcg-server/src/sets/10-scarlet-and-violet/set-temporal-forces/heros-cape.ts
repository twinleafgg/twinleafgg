import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class HerosCape extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  protected _tags = [CardTag.ACE_SPEC];

  public regulationMark = 'H';

  public set: string = 'TEF';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '152';

  public name: string = "Hero's Cape";

  public fullName: string = "Hero's Cape TEF";

  public text: string = 'The Pokémon this card is attached to gets +100 HP.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckHpEffect && effect.target.tools.includes(this)) {
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      effect.hp += 100;
    }
    return state;
  }
}
