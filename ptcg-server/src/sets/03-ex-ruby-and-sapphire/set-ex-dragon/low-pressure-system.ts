import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType } from '../../../game/store/card/card-types';
import { CheckHpEffect, CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class LowPressureSystem extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'DR';
  public name: string = 'Low Pressure System';
  public fullName: string = 'Low Pressure System DR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '86';
  public text: string =
    "Each [G] and [L] Pokémon in play (both yours and your opponent's) gets +10 HP.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckHpEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      const checkPokemonTypeEffect = new CheckPokemonTypeEffect(effect.target);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target)) {
        return state;
      }

      store.reduceEffect(state, checkPokemonTypeEffect);

      if (
        checkPokemonTypeEffect.cardTypes.includes(CardType.GRASS) ||
        checkPokemonTypeEffect.cardTypes.includes(CardType.LIGHTNING)
      ) {
        effect.hp += 10;
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
