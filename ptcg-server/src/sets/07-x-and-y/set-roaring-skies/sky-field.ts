import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { CheckTableStateEffect } from '../../../game/store/effects/check-effects';

export class SkyField extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;

  public set: string = 'ROS';

  public name: string = 'Sky Field';

  public fullName: string = 'Sky Field ROS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '89';

  public text: string =
    'Each player can have 8 Pokemon on his or her Bench. (When this card ' +
    'leaves play, each player discards Benched Pokemon until he or she has ' +
    '5 Pokemon on the Bench. The owner of this card discard first.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckTableStateEffect && StateUtils.getStadiumCard(state) === this) {
      effect.benchSizes = state.players.map((player, index) => {
        return effect.benchSizes[index] === 5 ? 8 : effect.benchSizes[index];
      });
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
