import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { MoveCardsEffect } from '../../../game/store/effects/game-effects';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { Player, StateUtils } from '../../../game';
import {DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class EmceesHype extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'DRI';
  public setNumber = '163';
  public cardImage = 'assets/cardback.png';
  public regulationMark: string = 'H';
  public name: string = "Emcee's Hype";
  public fullName: string = "Emcee's Hype DRI";
  public text: string =
    'Draw 2 cards. If your opponent has 3 or fewer Prize cards remaining, draw 2 more cards.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Move to supporter pile
      state = store.reduceEffect(
        state,
        new MoveCardsEffect(player.hand, player.supporter, { cards: [effect.trainerCard] }),
      );

      effect.preventDefault = true;

      DRAW_CARDS(store, state, player, 2);
      if (opponent.getPrizeLeft() <= 3) {
        DRAW_CARDS(store, state, player, 2);
      }

      MOVE_CARDS(store, state, player.supporter, player.discard, { sourceCard: this });
    }

    return state;
  }
}
