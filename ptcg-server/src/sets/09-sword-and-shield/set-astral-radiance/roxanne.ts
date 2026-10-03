import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StateUtils } from '../../../game/store/state-utils';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { GameError, GameMessage } from '../../../game';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { MoveCardsEffect } from '../../../game/store/effects/game-effects';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { WaitPrompt } from '../../../game/store/prompts/wait-prompt';
import {
  BOARD_ANIMATION_GATE_TIMEOUT_MS,
  DECK_SHUFFLE_ANIMATION_WAIT_MS,
} from '../../../game/store/prefabs/deck-shuffle-animation';

export class Roxanne extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'ASR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '150';

  public regulationMark = 'F';

  public name: string = 'Roxanne';

  public fullName: string = 'Roxanne ASR';

  public text: string = `You can use this card only if your opponent has 3 or fewer Prize cards remaining.

Each player shuffles their hand into their deck. Then, you draw 6 cards, and your opponent draws 2 cards.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (opponent.getPrizeLeft() > 3) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const playerCards = player.hand.cards.filter((c) => c !== this);
      const opponentCards = [...opponent.hand.cards];

      if (playerCards.length > 0) {
        state = MOVE_CARDS(store, state, player.hand, player.deck, {
          cards: playerCards,
          sourceCard: this,
        });
      }

      let opponentMovePrevented = false;
      if (opponentCards.length > 0) {
        const opponentMoveEffect = new MoveCardsEffect(opponent.hand, opponent.deck, {
          cards: opponentCards,
          sourceCard: this,
        });
        state = store.reduceEffect(state, opponentMoveEffect);
        opponentMovePrevented = !!opponentMoveEffect.preventDefault;
      }

      const drawCards = (): void => {
        DRAW_CARDS(store, state, player, 6);
        if (!opponentMovePrevented) {
          DRAW_CARDS(store, state, opponent, 2);
        }
      };

      const shufflePlayer = (then: () => void): void => {
        store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
          player.deck.applyOrder(order);
          store.prompt(
            state,
            new WaitPrompt(
              player.id,
              DECK_SHUFFLE_ANIMATION_WAIT_MS,
              'Deck shuffle animation',
              false,
            ),
            () => then(),
          );
        });
      };

      const shuffleOpponent = (then: () => void): void => {
        store.prompt(state, new ShuffleDeckPrompt(opponent.id), (order) => {
          opponent.deck.applyOrder(order);
          store.prompt(
            state,
            new WaitPrompt(
              opponent.id,
              DECK_SHUFFLE_ANIMATION_WAIT_MS,
              'Deck shuffle animation',
              false,
            ),
            () => then(),
          );
        });
      };

      const afterHandMoves = (): void => {
        shufflePlayer(() => {
          if (!opponentMovePrevented) {
            shuffleOpponent(() => drawCards());
          } else {
            drawCards();
          }
        });
      };

      if (playerCards.length > 0 || opponentCards.length > 0) {
        return store.prompt(
          state,
          new WaitPrompt(
            player.id,
            BOARD_ANIMATION_GATE_TIMEOUT_MS,
            'Hand to deck animation',
            false,
          ),
          () => afterHandMoves(),
        );
      }

      afterHandMoves();
      return state;
    }

    return state;
  }
}
