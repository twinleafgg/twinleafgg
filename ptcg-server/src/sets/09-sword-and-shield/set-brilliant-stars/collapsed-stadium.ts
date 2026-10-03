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

export class CollapsedStadium extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;

  public regulationMark = 'F';

  public set: string = 'BRS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '137';

  public name: string = 'Collapsed Stadium';

  public fullName: string = 'Collapsed Stadium BRS';

  public text: string =
    "Each player can't have more than 4 Benched Pokémon. " +
    'If a player has 5 or more Benched Pokémon, they ' +
    'discard Benched Pokémon until they have 4 Pokémon ' +
    'on the Bench. The player who played this card discards ' +
    'first. If more than one effect changes the number of ' +
    'Benched Pokémon allowed, use the smaller number.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckTableStateEffect && StateUtils.getStadiumCard(state) === this) {
      effect.benchSizes = [4, 4];
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
