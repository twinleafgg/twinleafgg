import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameError, GameMessage, StateUtils } from '../../..';
import { DRAW_CARDS_UNTIL_CARDS_IN_HAND, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Hugh extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'BCR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '130';

  public name: string = 'Hugh';

  public fullName: string = 'Hugh BCR';

  public text: string =
    'Both players discard cards from their hand until they each have 5 cards in hand. (Your opponent discards first. Any player with 5 cards or less in their hands do not discard any cards.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const supporterTurn = player.supporterTurn;

      // Get opponent's hand length
      const opponentHandLength = opponent.hand.cards.length;

      // Set discard amount to reach hand size of 5
      const discardAmount = opponentHandLength - 5;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      // Opponent discards first
      if (opponent.hand.cards.length > 5) {
        store.prompt(
          state,
          new ChooseCardsPrompt(
            opponent,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            opponent.hand,
            {},
            { min: discardAmount, max: discardAmount, allowCancel: false },
          ),
          (selected) => {
            const cards = selected || [];
            MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards, sourceCard: this });
          },
        );
      } else {
        DRAW_CARDS_UNTIL_CARDS_IN_HAND(opponent, 5);
      }

      const playerCards = player.hand.cards.filter((c) => c !== this);
      // Get player's hand length
      const playerHandLength = playerCards.length;

      // Set discard amount to reach hand size of 5
      const playerDiscardAmount = playerHandLength - 5;

      // Player discards next
      if (player.hand.cards.length > 5) {
        store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            player.hand,
            {},
            { min: playerDiscardAmount, max: playerDiscardAmount, allowCancel: false },
          ),
          (selected) => {
            const cards = selected || [];
            MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
          },
        );
      } else {
        DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, 5);
      }
      return state;
    }
    return state;
  }
}
