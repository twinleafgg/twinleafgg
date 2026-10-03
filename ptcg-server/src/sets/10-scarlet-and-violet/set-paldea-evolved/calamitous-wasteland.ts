import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, Stage, CardType } from '../../../game/store/card/card-types';
import {
  CheckPokemonTypeEffect,
  CheckRetreatCostEffect,
} from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';

export class CalamitousWasteland extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'PAL';
  public regulationMark: string = 'G';
  public name: string = 'Calamitous Wasteland';
  public fullName: string = 'Calamitous Wasteland PAL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '175';
  public text: string =
    "The Retreat Cost of each Basic non-[F] Pokémon in play (both yours and your opponent's) is [C] more.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckRetreatCostEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active, this)) {
        return state;
      }

      if (player.active.isStage(Stage.BASIC)) {
        const checkPokemonTypeEffect = new CheckPokemonTypeEffect(player.active);
        store.reduceEffect(state, checkPokemonTypeEffect);

        if (!checkPokemonTypeEffect.cardTypes.includes(CardType.FIGHTING)) {
          effect.cost.push(CardType.COLORLESS);
        }
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
