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
  CheckAttackCostEffect,
  CheckPokemonTypeEffect,
} from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class DimensionValley extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'PHF';
  public name: string = 'Dimension Valley';
  public fullName: string = 'Dimension Valley PHF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '93';
  public text: string =
    "Each [P] Pokémon's attacks (both yours and your opponent's) cost [C] less.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckAttackCostEffect && StateUtils.getStadiumCard(state) === this) {
      const index = effect.cost.indexOf(CardType.COLORLESS);
      const checkPokemonType = new CheckPokemonTypeEffect(effect.player.active);

      if (
        index === -1 ||
        IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active)
      ) {
        return state;
      }

      store.reduceEffect(state, checkPokemonType);

      if (checkPokemonType.cardTypes.includes(CardType.PSYCHIC)) {
        effect.cost.splice(index, 1);
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
