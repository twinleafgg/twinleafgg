import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StateUtils } from '../../../game/store/state-utils';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { Card, GameError, GameMessage } from '../../../game';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { DRAW_CARDS, MOVE_HAND_TO_DECK_THEN_DRAW } from '../../../game/store/prefabs/prefabs';

export class Marnie extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'SSH';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '169';

  public name: string = 'Marnie';

  public fullName: string = 'Marnie SSH';

  public text: string =
    'Each player shuffles their hand and puts it on the bottom of their deck. If either player put any cards on the bottom of their deck in this way, you draw 5 cards, and your opponent draws 4 cards.';

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

      const runOpponent = (): void => {
        if (opponentCards.length > 0) {
          MOVE_HAND_TO_DECK_THEN_DRAW(store, state, opponent, {
            cards: opponentCards,
            drawCount: 4,
            sourceCard: this,
          });
          return;
        }
        if (playerCards.length > 0) {
          DRAW_CARDS(store, state, opponent, 4);
        }
      };

      if (playerCards.length > 0) {
        return MOVE_HAND_TO_DECK_THEN_DRAW(store, state, player, {
          cards: playerCards,
          drawCount: 5,
          sourceCard: this,
          afterDraw: () => runOpponent(),
        });
      }

      return MOVE_HAND_TO_DECK_THEN_DRAW(store, state, opponent, {
        cards: opponentCards,
        drawCount: 4,
        sourceCard: this,
        afterDraw: () => {
          DRAW_CARDS(store, state, player, 5);
        },
        onMovePrevented: () => {
          DRAW_CARDS(store, state, player, 5);
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
