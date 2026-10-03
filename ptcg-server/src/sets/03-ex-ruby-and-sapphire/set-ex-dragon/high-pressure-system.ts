import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { GamePhase, State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType } from '../../../game/store/card/card-types';
import {
  CheckPokemonTypeEffect,
  CheckRetreatCostEffect,
} from '../../../game/store/effects/check-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class HighPressureSystem extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'DR';
  public name: string = 'High Pressure System';
  public fullName: string = 'High Pressure System DR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '85';
  public text: string = 'Each player pays [C] less to retreat his or her [R] and [W] Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof CheckRetreatCostEffect &&
      StateUtils.getStadiumCard(state) === this &&
      state.phase !== GamePhase.ATTACK
    ) {
      const checkPokemonTypeEffect = new CheckPokemonTypeEffect(effect.player.active);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active)) {
        return state;
      }

      store.reduceEffect(state, checkPokemonTypeEffect);

      if (
        checkPokemonTypeEffect.cardTypes.includes(CardType.FIRE) ||
        checkPokemonTypeEffect.cardTypes.includes(CardType.WATER)
      ) {
        const colorlessIndex = effect.cost.lastIndexOf(CardType.COLORLESS);
        if (colorlessIndex !== -1) {
          effect.cost.splice(colorlessIndex, 1);
        }
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
