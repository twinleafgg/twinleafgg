import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import {
  CheckProvidedEnergyEffect,
  CheckPokemonStatsEffect,
} from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class ShadowCircle extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'XY';
  public name: string = 'Shadow Circle';
  public fullName: string = 'Shadow Circle XY';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '126';
  public text: string =
    "Each Pokemon that has any [D] Energy attached to it (both yours and your opponent's) has no Weakness.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckPokemonStatsEffect && StateUtils.getStadiumCard(state) === this) {
      const target = effect.target;
      const player = StateUtils.findOwner(state, target);
      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, target);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, effect.target)) {
        return state;
      }

      store.reduceEffect(state, checkProvidedEnergyEffect);

      const energyMap = checkProvidedEnergyEffect.energyMap;
      const hasDarknessEnergy = StateUtils.checkEnoughEnergy(energyMap, [CardType.DARK]);

      if (hasDarknessEnergy) {
        effect.weakness = [];
      }

      return state;
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
