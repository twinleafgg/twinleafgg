import { GameError, GameMessage, StateUtils } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckSpecialConditionRemovalEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class SeaOfNothingness extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'CIN';
  public name: string = 'Sea of Nothingness';
  public fullName: string = 'Sea of Nothingness CIN';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '99';
  public text: string =
    "Special Conditions are not removed when Pokémon (both yours and your opponent's) evolve or devolve.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof CheckSpecialConditionRemovalEffect &&
      StateUtils.getStadiumCard(state) === this
    ) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target, this)) {
        return state;
      }

      // Add all special conditions that the target has to the preserved list
      effect.target.specialConditions.forEach((condition) => {
        if (!effect.preservedConditions.includes(condition)) {
          effect.preservedConditions.push(condition);
        }
      });
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
