import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameError, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import {
  CheckProvidedEnergyEffect,
  CheckRetreatCostEffect,
} from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class AltarOfTheMoone extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'GRI';
  public setNumber: string = '117';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Altar of the Moone';
  public fullName: string = 'Altar of the Moone GRI';
  public text: string =
    "The Retreat Cost of each Pokémon (both yours and your opponent's) that has any Psychic or [D] Energy attached to it is ColorlessColorless less.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckRetreatCostEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, player.active);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active, this)) {
        return state;
      }

      store.reduceEffect(state, checkProvidedEnergyEffect);

      const energyMap = checkProvidedEnergyEffect.energyMap;
      const hasPsychicOrDark =
        StateUtils.checkEnoughEnergy(energyMap, [CardType.PSYCHIC]) ||
        StateUtils.checkEnoughEnergy(energyMap, [CardType.DARK]);

      if (hasPsychicOrDark) {
        // Remove up to 2 colorless from retreat cost
        const index1 = effect.cost.indexOf(CardType.COLORLESS);
        if (index1 !== -1) {
          effect.cost.splice(index1, 1);
          const index2 = effect.cost.indexOf(CardType.COLORLESS);
          if (index2 !== -1) {
            effect.cost.splice(index2, 1);
          }
        }
      }
      return state;
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
