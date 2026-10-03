import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StateUtils, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class MountainRing extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'FFI';
  public setNumber: string = '97';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mountain Ring';
  public fullName: string = 'Mountain Ring FFI';
  public text: string =
    "Prevent all damage done to Benched Pokémon by attacks (both yours and your opponent's).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PutDamageEffect && StateUtils.getStadiumCard(state) === this) {
      const targetOwner = StateUtils.findOwner(state, effect.target);
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, targetOwner, effect.target)) {
        return state;
      }

      if (targetOwner.bench.includes(effect.target)) {
        effect.preventDefault = true;
      }
    }

    return state;
  }
}
