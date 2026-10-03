import { GameError, GameMessage, StateUtils } from '../../../game';
import { SpecialCondition, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckSpecialConditionRemovalEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class FullFlame extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'LM';
  public name: string = 'Full Flame';
  public fullName: string = 'Full Flame LM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '74';
  public text: string =
    "Put 4 damage counters instead of 2 on each Burned Pokémon between turns. The Special Condition Burned can't be removed by evolving or devolving the Burned Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof BetweenTurnsEffect && StateUtils.getStadiumCard(state) === this) {
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active)) {
        return state;
      }

      // If the active Pokemon is burned, set burn damage to 40 (4 damage counters)
      if (effect.player.active.specialConditions.includes(SpecialCondition.BURNED)) {
        effect.burnDamage = 40;
      }
    }

    // Preserve BURNED condition during evolution
    if (
      effect instanceof CheckSpecialConditionRemovalEffect &&
      StateUtils.getStadiumCard(state) === this
    ) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target)) {
        return state;
      }

      if (effect.target.specialConditions.includes(SpecialCondition.BURNED)) {
        if (!effect.preservedConditions.includes(SpecialCondition.BURNED)) {
          effect.preservedConditions.push(SpecialCondition.BURNED);
        }
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
