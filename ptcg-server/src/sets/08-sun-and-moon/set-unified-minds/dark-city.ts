import { GameError, GameMessage, StateUtils } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import {
  CheckPokemonTypeEffect,
  CheckRetreatCostEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class DarkCity extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'UNM';
  public name: string = 'Dark City';
  public fullName: string = 'Dark City UNM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '193';
  public text: string =
    "Basic [D] Pokémon in play (both yours and your opponent's) have no Retreat Cost.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckRetreatCostEffect && StateUtils.getStadiumCard(state) === this) {
      const checkPokemonType = new CheckPokemonTypeEffect(effect.player.active);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active, this)) {
        return state;
      }

      store.reduceEffect(state, checkPokemonType);

      if (checkPokemonType.cardTypes.includes(CardType.DARK)) {
        effect.cost = [];
      }
      return state;
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
