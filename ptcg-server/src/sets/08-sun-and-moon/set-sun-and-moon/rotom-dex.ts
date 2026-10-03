import { GameError, GameMessage, State, StoreLike, TrainerCard, TrainerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  DRAW_CARDS_AS_FACE_DOWN_PRIZES,
  GET_PLAYER_PRIZES,
  MOVE_CARD_TO,
  SHUFFLE_PRIZES_INTO_DECK,
} from '../../../game/store/prefabs/prefabs';

export class RotomDex extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'SUM';

  public name: string = 'Rotom Dex';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '131';

  public fullName: string = 'Rotom Dex SUM';

  public text: string =
    'After counting your Prize cards, shuffle them into your deck. Then, take that many cards from the top of your deck and put them face down as your Prize cards.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const prizeCount = GET_PLAYER_PRIZES(player).length;

      if (prizeCount === 0) throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);

      SHUFFLE_PRIZES_INTO_DECK(store, state, player);
      DRAW_CARDS_AS_FACE_DOWN_PRIZES(player, prizeCount);
      MOVE_CARD_TO(state, this, player.discard);
      return state;
    }

    return state;
  }
}
