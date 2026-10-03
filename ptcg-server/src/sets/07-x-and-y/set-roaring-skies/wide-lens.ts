import { StoreLike, State, StateUtils } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import {
  AfterDamageEffect,
  ApplyWeaknessEffect,
  PutDamageEffect,
} from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class WideLens extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'ROS';
  public name: string = 'Wide Lens';
  public fullName: string = 'Muscle Band ROS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';

  public text: string =
    ' Damage from the attacks of the Pokémon this card is attached to' +
    " is affected by Weakness and Resistance for your opponent's Benched Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PutDamageEffect && effect.player.active.tools.includes(this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      opponent.bench.forEach((card) => {
        if (effect.damage > 0 && effect.target === card) {
          const applyWeakness = new ApplyWeaknessEffect(effect.attackEffect, effect.damage);
          applyWeakness.target = effect.target;
          state = store.reduceEffect(state, applyWeakness);

          effect.damage = applyWeakness.damage;
        }
        const damage = Math.max(0, effect.damage);

        if (damage > 0) {
          const afterDamageEffect = new AfterDamageEffect(effect.attackEffect, damage);
          afterDamageEffect.target = effect.target;
          store.reduceEffect(state, afterDamageEffect);
        }
      });

      return state;
    }

    return state;
  }
}
