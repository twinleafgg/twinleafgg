import { TrainerCard, TrainerType, StoreLike, State } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class ProtectionCube extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'FLF';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '95';

  public name: string = 'Protection Cube';

  public fullName: string = 'Protection Cube FLF';

  public text: string =
    'Prevent all damage done to the Pokémon this card is attached to by attacks it uses.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof PutDamageEffect &&
      effect.source == effect.player.active &&
      effect.source.tools.includes(this)
    ) {
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (effect.target == effect.source) {
        effect.preventDefault = true;
      }
    }
    return state;
  }
}
