import { TrainerCard } from '../../game/store/card/trainer-card';
import { SpecialCondition, TrainerType } from '../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, GameError } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { BetweenTurnsEffect } from '../../game/store/effects/game-phase-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../game/store/prefabs/stadium-effect';
import { UseStadiumEffect } from '../../game/store/effects/game-effects';

export class WelaVolcanoPark extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'DRM';
  public setNumber: string = '63';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Wela Volcano Park';
  public fullName: string = 'Wela Volcano Park DRM';
  public text: string =
    "Whenever a player flips a coin for the Special Condition Burned between turns, that Special Condition isn't removed even if the result is heads.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof BetweenTurnsEffect && StateUtils.getStadiumCard(state) === this) {
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active)) {
        return state;
      }
      if (effect.player.active.specialConditions.includes(SpecialCondition.BURNED)) {
        effect.burnFlipResult = true;
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
