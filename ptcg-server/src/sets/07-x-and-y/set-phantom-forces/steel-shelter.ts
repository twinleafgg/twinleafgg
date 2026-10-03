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
  CheckPokemonTypeEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { PlayerType } from '../../../game';

export class SteelShelter extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'PHF';
  public name: string = 'Steel Shelter';
  public fullName: string = 'Steel Shelter PFO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '105';
  public text: string =
    "Each [M] Pokemon (both yours and your opponent's) can't be affected by any Special Conditions. (Remove any Special Conditions affecting those Pokemon.)";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckTableStateEffect && StateUtils.getStadiumCard(state) === this) {
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (cardList.specialConditions.length === 0) {
            return;
          }

          if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, cardList)) {
            return;
          }

          const checkPokemonType = new CheckPokemonTypeEffect(cardList);
          store.reduceEffect(state, checkPokemonType);

          if (checkPokemonType.cardTypes.includes(CardType.METAL)) {
            cardList.clearAllSpecialConditions();
          }
        });
      });
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
