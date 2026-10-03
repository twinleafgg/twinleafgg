import { GameLog, StateUtils } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { PlayStadiumEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class ChaoticSwell extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '187';

  protected _trainerType = TrainerType.STADIUM;

  public set = 'CEC';

  public name = 'Chaotic Swell';

  public fullName = 'Chaotic Swell CEC';

  public text =
    'Whenever either player plays a Stadium card from their hand, discard that Stadium card after discarding this one. (The new Stadium card has no effect.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.hand, player.discard, { cards: [effect.trainerCard], sourceCard: this });

      store.log(state, GameLog.LOG_DISCARD_STADIUM_CHAOTIC_SWELL, {
        name: player.name,
        card: effect.trainerCard.name,
      });
    }

    return state;
  }
}
