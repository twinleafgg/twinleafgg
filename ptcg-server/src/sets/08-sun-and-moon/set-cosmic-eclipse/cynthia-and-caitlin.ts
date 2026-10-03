import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { CardTag, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { DiscardToHandEffect, TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { SelectOptionPrompt } from '../../../game/store/prompts/select-option-prompt';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: CynthiaAndCaitlin,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const supporterTurn = player.supporterTurn;

  if (supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  // Check if there are any valid supporters in discard (excluding Cynthia & Caitlin)
  const validSupportersInDiscard = player.discard.cards.filter(
    (c) =>
      c instanceof TrainerCard &&
      c.trainerType === TrainerType.SUPPORTER &&
      c.name !== 'Cynthia & Caitlin',
  );

  // If no valid supporters, just do the discard and draw effect
  if (validSupportersInDiscard.length === 0) {
    if (player.hand.cards.length === 0) {
      throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
    }

    // Choose a card to discard
    state = store.prompt(
      state,
      new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        {},
        { min: 1, max: 1, allowCancel: false },
      ),
      (discarded) => {
        if (discarded && discarded.length > 0) {
          MOVE_CARDS(store, state, player.hand, player.discard, {
            cards: discarded,
            sourceCard: self,
          });
          // Draw 3 cards
          DRAW_CARDS(store, state, player, 3);
        }
      },
    );
    return state;
  }

  // Create blocked indices for Cynthia & Caitlin cards
  const blocked: number[] = [];
  player.discard.cards.forEach((card, index) => {
    if (card instanceof TrainerCard && card.name === 'Cynthia & Caitlin') {
      blocked.push(index);
    }
  });

  // Show the options prompt
  state = store.prompt(
    state,
    new SelectOptionPrompt(
      player.id,
      GameMessage.CHOOSE_OPTION,
      [
        'Put a Supporter card from your discard pile into your hand.',
        'Put a Supporter card from your discard pile into your hand, and discard another card from your hand to draw 3 cards.',
      ],
      {
        allowCancel: true,
        defaultValue: 0,
      },
    ),
    (choice) => {
      if (choice === 0) {
        // Option 1: Just recover a supporter
        if (validSupportersInDiscard.length === 0) {
          throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
        }
        state = store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.discard,
            { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
            { min: 1, max: 1, allowCancel: false, blocked },
          ),
          (selected) => {
            if (selected && selected.length > 0) {
              MOVE_CARDS(store, state, player.discard, player.hand, {
                cards: selected,
                sourceCard: self,
              });
            }
          },
        );
      } else if (choice === 1) {
        // Option 2: Discard a card first, then recover a supporter and draw 3
        if (player.hand.cards.length === 0) {
          throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
        }

        // First, choose a card to discard
        state = store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            player.hand,
            {},
            { min: 1, max: 1, allowCancel: false },
          ),
          (discarded) => {
            if (discarded && discarded.length > 0) {
              // Then choose a supporter to recover
              state = store.prompt(
                state,
                new ChooseCardsPrompt(
                  player,
                  GameMessage.CHOOSE_CARD_TO_HAND,
                  player.discard,
                  { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
                  { min: 1, max: 1, allowCancel: false, blocked },
                ),
                (selected) => {
                  if (selected && selected.length > 0) {
                    MOVE_CARDS(store, state, player.discard, player.hand, { cards: selected, sourceCard: self });
                    // Now move the discarded card to discard
                    MOVE_CARDS(store, state, player.hand, player.discard, { cards: discarded, sourceCard: self });
                    // Draw 3 cards
                    const drawnCards = player.deck.cards.slice(0, 3);
                    MOVE_CARDS(store, state, player.deck, player.hand, { cards: drawnCards, sourceCard: self });
                  }
                },
              );
            }
          },
        );
      }
    },
  );
  return state;
}

export class CynthiaAndCaitlin extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'CEC';
  protected _tags = [CardTag.TAG_TEAM];
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '189';
  public name: string = 'Cynthia & Caitlin';
  public fullName: string = 'Cynthia & Caitlin CEC';

  public text: string = `Put a Supporter card from your discard pile into your hand. You can't choose Cynthia & Caitlin or a card you discarded with the effect of this card.

When you play this card, you may discard another card from your hand. If you do, draw 3 cards.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      // Check if DiscardToHandEffect is prevented
      const discardEffect = new DiscardToHandEffect(player, this);
      store.reduceEffect(state, discardEffect);

      if (effect.preventDefault) {
        // If prevented, just discard the card and return
        return state;
      }

      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }
    return state;
  }
}
