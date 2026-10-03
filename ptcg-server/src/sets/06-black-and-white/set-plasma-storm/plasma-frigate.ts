import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { GameError, GameMessage, StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import {
  CheckPokemonStatsEffect,
  CheckProvidedEnergyEffect,
} from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class PlasmaFrigate extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  protected _tags = [CardTag.TEAM_PLASMA];
  public set: string = 'PLS';
  public setNumber: string = '124';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Plasma Frigate';
  public fullName: string = 'Plasma Frigate PLS';
  public text: string =
    "Each Pokémon that has any Plasma Energy attached to it (both yours and your opponent's) has no Weakness.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckPokemonStatsEffect && StateUtils.getStadiumCard(state) === this) {
      const player = StateUtils.findOwner(state, effect.target);
      const checkEnergy = new CheckProvidedEnergyEffect(player, effect.target);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, effect.target)) {
        return state;
      }

      store.reduceEffect(state, checkEnergy);

      if (checkEnergy.energyMap.some((em) => em.card.name === 'Plasma Energy')) {
        effect.weakness = [];
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
