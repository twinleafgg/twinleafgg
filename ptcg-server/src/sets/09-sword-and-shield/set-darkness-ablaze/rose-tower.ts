import { GameError, GameMessage } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { DRAW_CARDS_UNTIL_CARDS_IN_HAND } from '../../../game/store/prefabs/prefabs';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class RoseTower extends TrainerCard {
  public regulationMark = 'D';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '169';

  protected _trainerType = TrainerType.STADIUM;

  public set = 'DAA';

  public name = 'Rose Tower';

  public fullName = 'Rose Tower DAA';

  public text =
    "Once during each player's turn, that player may draw cards until they have 3 cards in their hand.";

  reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      if (effect.player.hand.cards.length >= 3 || effect.player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      return this.useStadium(store, state, effect);
    }
    return state;
  }

  useStadium(store: StoreLike, state: State, effect: UseStadiumEffect): State {
    const player = effect.player;

    DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, 3);

    return state;
  }
}
