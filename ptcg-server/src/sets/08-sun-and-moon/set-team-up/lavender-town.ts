import { StateUtils } from '../../../game/store/state-utils';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';

export class LavenderTown extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '147';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'TEU';
  public name = 'Lavender Town';
  public fullName = 'Lavender Town TEU';

  public text =
    "Once during each player's turn, that player may have their opponent reveal their hand.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      SHOW_CARDS_TO_PLAYER(store, state, player, opponent.hand.cards);
    }
    return state;
  }
}
