import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, Stage } from '../../../game/store/card/card-types';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';

export class TrainingCenter extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'FFI';
  public name: string = 'Training Center';
  public fullName: string = 'Training Center FFI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '102';
  public text: string =
    "Each Stage 1 and Stage 2 Pokémon in play (both yours and your opponent's) gets +30 HP.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckHpEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      const card = effect.target.getPokemonCard();

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target)) {
        return state;
      }

      if (card === undefined) {
        return state;
      }

      if (card.stage === Stage.STAGE_1 || card.stage === Stage.STAGE_2) {
        effect.hp += 30;
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
