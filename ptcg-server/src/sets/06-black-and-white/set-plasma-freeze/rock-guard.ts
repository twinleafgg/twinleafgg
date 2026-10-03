import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State, GamePhase } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class RockGuard extends TrainerCard {
  protected _tags = [CardTag.ACE_SPEC];

  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'PLF';

  public name: string = 'Rock Guard';

  public fullName: string = 'Rock Guard PLF';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '108';

  public text: string =
    'If the Pokemon this card is attached to is your Active Pokemon and is ' +
    "damaged by an opponent's attack (even if that Pokemon is Knocked Out), " +
    'put 6 damage counters on the Attacking Pokemon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AfterDamageEffect && effect.target.tools.includes(this)) {
      const player = effect.player;
      const targetPlayer = StateUtils.findOwner(state, effect.target);

      if (effect.damage <= 0 || player === targetPlayer || targetPlayer.active !== effect.target) {
        return state;
      }

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (state.phase === GamePhase.ATTACK) {
        effect.source.damage += 60;
      }
    }

    return state;
  }
}
