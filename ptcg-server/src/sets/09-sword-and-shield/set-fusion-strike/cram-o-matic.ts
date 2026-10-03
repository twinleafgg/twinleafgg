import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { GameMessage } from '../../../game/game-message';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';

import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { Effect } from '../../../game/store/effects/effect';
import { Card, CardList, GameError } from '../../../game';

import { COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  let cards: Card[] = [];

  cards = player.hand.cards.filter(
    (c) => c instanceof TrainerCard && c.trainerType == TrainerType.ITEM,
  );

  if (cards.length < 1) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  // prepare card list without Junk Arm
  const handTemp = new CardList();
  handTemp.cards = player.hand.cards;

  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_DISCARD,
      handTemp,
      { superType: SuperType.TRAINER, trainerType: TrainerType.ITEM },
      { min: 1, max: 1, allowCancel: false },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  MOVE_CARDS(store, state, player.hand, player.discard, {
    cards: cards,
    sourceCard: effect.trainerCard,
  });

  // Operation canceled by the user
  if (cards.length === 0) {
    return state;
  }

  let coin1Result = false;
  yield COIN_FLIP_PROMPT(store, state, player, (result) => {
    coin1Result = result;
    next();
  });
  if (coin1Result) {
    let cards: any[] = [];
    yield store.prompt(
      state,
      new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        {},
        { min: 1, max: 1, allowCancel: false },
      ),
      (selected: any[]) => {
        cards = selected || [];
        next();
      },
    );
    MOVE_CARDS(store, state, player.deck, player.hand, {
      cards: cards,
      sourceCard: effect.trainerCard,
    });
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order: any[]) => {
    player.deck.applyOrder(order);
  });
}

export class Creamomatic extends TrainerCard {
  protected _trainerType = TrainerType.ITEM;

  public set: string = 'FST';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '229';

  public regulationMark = 'E';

  public name: string = 'Cram-o-matic';
  public fullName: string = 'Cram-o-matic FST';

  public text: string = `You can use this card only if you discard another Item card from your hand.

Flip a coin. If heads, search your deck for a card and put it into your hand. Then, shuffle your deck.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
