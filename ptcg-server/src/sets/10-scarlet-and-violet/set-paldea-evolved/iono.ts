import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StateUtils } from '../../../game/store/state-utils';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { Card, GameError, GameMessage, Player } from '../../../game';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { DRAW_CARDS, MOVE_HAND_TO_DECK_THEN_DRAW } from '../../../game/store/prefabs/prefabs';

export class Iono extends TrainerCard {
  public regulationMark = 'G';
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'PAL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '185';
  public name: string = 'Iono';
  public fullName: string = 'Iono PAL';

  public text: string =
    'Each player shuffles their hand and puts it on the bottom of their deck. ' +
    'If either player put any cards on the bottom of their deck in this way, ' +
    'each player draws a card for each of their remaining Prize cards.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }

    const opponent = StateUtils.getOpponent(state, player);
    const otherCardsInHand = player.hand.cards.filter((c) => c !== this).length;

    if (otherCardsInHand === 0 && player.deck.cards.length === 0) {
      return false;
    }

    if (otherCardsInHand === 0 && opponent.hand.cards.length === 0) {
      return false;
    }

    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      const playerCards = player.hand.cards.filter((c) => c !== this);
      const opponentCards = [...opponent.hand.cards];

      if (playerCards.length === 0 && player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (playerCards.length === 0 && opponentCards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      this.shuffleCards(playerCards);
      this.shuffleCards(opponentCards);

      // One player at a time (hand→deck wait → draw) so board animations can finish.
      const runOpponent = (): void => {
        if (opponentCards.length > 0) {
          MOVE_HAND_TO_DECK_THEN_DRAW(store, state, opponent, {
            cards: opponentCards,
            drawCount: opponent.getPrizeLeft(),
            sourceCard: this,
          });
          return;
        }
        // Player put cards; opponent had an empty hand — still draws for prizes.
        if (playerCards.length > 0) {
          DRAW_CARDS(store, state, opponent, opponent.getPrizeLeft());
        }
      };

      if (playerCards.length > 0) {
        return MOVE_HAND_TO_DECK_THEN_DRAW(store, state, player, {
          cards: playerCards,
          drawCount: player.getPrizeLeft(),
          sourceCard: this,
          afterDraw: () => runOpponent(),
        });
      }

      // Only opponent has cards to put on the bottom.
      return MOVE_HAND_TO_DECK_THEN_DRAW(store, state, opponent, {
        cards: opponentCards,
        drawCount: opponent.getPrizeLeft(),
        sourceCard: this,
        afterDraw: () => {
          DRAW_CARDS(store, state, player, player.getPrizeLeft());
        },
        onMovePrevented: () => {
          // Opponent put was blocked (e.g. Milotic); acting player still draws.
          DRAW_CARDS(store, state, player, player.getPrizeLeft());
        },
      });
    }

    return state;
  }

  private shuffleCards(cards: Card[]): void {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  }
}
