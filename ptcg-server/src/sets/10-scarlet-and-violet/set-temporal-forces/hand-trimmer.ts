import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, Player, StateUtils } from '../../..';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HandTrimmer extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public regulationMark = 'H';

  public set: string = 'TEF';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '150';

  public name: string = 'Hand Trimmer';

  public fullName: string = 'Hand Trimmer TEF';

  public text: string =
    'Both players discard cards from their hand until they each have 5 cards in hand. (Your opponent discards first. Any player with 5 cards or less in their hands do not discard any cards.)';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Get opponent's hand length
      const opponentHandLength = opponent.hand.cards.length;

      // Set discard amount to reach hand size of 5
      const discardAmount = opponentHandLength - 5;

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
            MOVE_CARDS(store, state, opponent.hand, opponent.discard, {
              cards: cards,
              sourceCard: this,
            });
          },
        );
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
            MOVE_CARDS(store, state, player.hand, player.discard, {
              cards: cards,
              sourceCard: this,
            });
          },
        );
      }

      return state;
    }
    return state;
  }
}
