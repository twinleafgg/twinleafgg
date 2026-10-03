import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType, SpecialCondition } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import {
  CheckPokemonTypeEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

const BLOCKED_CONDITIONS = [
  SpecialCondition.ASLEEP,
  SpecialCondition.CONFUSED,
  SpecialCondition.PARALYZED,
];

export class SidneysStadium extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'PK';
  public name: string = "Sidney's Stadium";
  public fullName: string = "Sidney's Stadium PK";
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '82';
  public text: string = "Each player's [D] Pokémon can't be Asleep, Confused, or Paralyzed.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckTableStateEffect && StateUtils.getStadiumCard(state) === this) {
      state.players.forEach((player) => {
        if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, player.active)) {
          return;
        }

        if (!BLOCKED_CONDITIONS.some((c) => player.active.specialConditions.includes(c))) {
          return;
        }

        const checkPokemonType = new CheckPokemonTypeEffect(player.active);
        store.reduceEffect(state, checkPokemonType);

        if (checkPokemonType.cardTypes.includes(CardType.DARK)) {
          BLOCKED_CONDITIONS.forEach((c) => player.active.removeSpecialCondition(c));
        }
      });
      return state;
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
