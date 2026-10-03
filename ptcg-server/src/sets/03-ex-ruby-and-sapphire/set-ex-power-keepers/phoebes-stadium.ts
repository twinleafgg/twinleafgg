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

export class PhoebesStadium extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'PK';
  public name: string = "Phoebe's Stadium";
  public fullName: string = "Phoebe's Stadium PK";
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '79';
  public text: string = 'Each player pays [C][C] less to retreat his or her [P] Pokémon.';

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

      if (checkPokemonTypeEffect.cardTypes.includes(CardType.PSYCHIC)) {
        for (let i = 0; i < 2; i++) {
          const colorlessIndex = effect.cost.lastIndexOf(CardType.COLORLESS);
          if (colorlessIndex === -1) {
            break;
          }
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
