import { Card } from '../../../game/store/card/card';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';

import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import {
  DRAW_CARDS,
  MOVE_CARDS,
  MULTIPLE_COIN_FLIPS_PROMPT,
} from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
  self: Card,
): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  let coinResults: boolean[] = [];
  yield MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, (results) => {
    coinResults = results;
    next();
  });

  if (coinResults.every((r) => r === true)) {
    let cards: Card[] = [];
    yield store.prompt(
      state,
      new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        {},
        { min: 1, max: 1, allowCancel: false },
      ),
      (selected) => {
        cards = selected;
        next();
      },
    );

    // Get selected cards
    MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: self });
    // Shuffle the deck
    yield store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
      player.deck.applyOrder(order);
      next();
    });

    return state;
  }

  if (coinResults.some((r) => r === true)) {
    // Get selected cards
    DRAW_CARDS(store, state, player, 1);
    return state;
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class VictoryMedal extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'DP';
  public name: string = 'Victory Medal';
  public fullName: string = 'Victory Medal PR';

  public text: string =
    'Flip 2 coins. If one of them is heads, draw a card. If both are heads, ' +
    'search your deck for any 1 card, put it into your hand, and shuffle ' +
    'your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect, this);
      return generator.next().value;
    }

    return state;
  }
}
