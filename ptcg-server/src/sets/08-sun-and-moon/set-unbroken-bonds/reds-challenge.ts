import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { GameError } from '../../../game';
import { Player } from '../../../game/store/state/player';
import {
  DISCARD_X_CARDS_FROM_YOUR_HAND,
  WAS_TRAINER_USED,
} from '../../../game/store/prefabs/trainer-prefabs';
import { SEARCH_DECK_FOR_CARDS_TO_HAND, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class RedsChallenge extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'UNB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '184';
  public name: string = "Red's Challenge";
  public fullName: string = "Red's Challenge UNB";

  public text: string =
    'You can play this card only if you discard 2 other cards from your hand.\n\nSearch your deck for a card and put it into your hand.Then, shuffle your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    // Check if supporter already played this turn
    if (player.supporterTurn > 0) {
      return false;
    }

    if (player.deck.cards.length === 0) {
      return false;
    }

    if (player.hand.cards.filter((c) => c !== this).length < 2) {
      return false;
    }

    // No other restrictions - card can be played
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (player.hand.cards.filter((c) => c !== this).length < 2) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      DISCARD_X_CARDS_FROM_YOUR_HAND(effect, store, state, 2, 2);
      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        {},
        { min: 1, max: 1, allowCancel: false },
      );
    }

    return state;
  }
}
