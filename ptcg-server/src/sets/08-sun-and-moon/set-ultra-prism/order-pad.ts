import { GameError, ShowCardsPrompt, StateUtils } from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';

import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

import { COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;
  MOVE_CARDS(store, state, player.hand, player.supporter, {
    cards: [effect.trainerCard],
    sourceCard: effect.trainerCard,
  });

  let coin1Result = false;
  yield COIN_FLIP_PROMPT(store, state, player, (result) => {
    coin1Result = result;

    next();
  });

  let cards: any[] = [];

  if (coin1Result) {
    yield store.prompt(
      state,
      new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.TRAINER, trainerType: TrainerType.ITEM },
        { min: 0, max: 1, allowCancel: false },
      ),
      (selected: any[]) => {
        cards = selected || [];
        next();
      },
    );
    if (cards.length > 0) {
      MOVE_CARDS(store, state, player.deck, player.hand, {
        cards: cards,
        sourceCard: effect.trainerCard,
      });
    }
    yield store.prompt(
      state,
      new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
      () => state,
    );

    return store.prompt(state, new ShuffleDeckPrompt(player.id), (order: any[]) => {
      player.deck.applyOrder(order);
    });
  }
}

export class OrderPad extends TrainerCard {
  protected _trainerType = TrainerType.ITEM;

  public set: string = 'UPR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '131';
  public name: string = 'Order Pad';
  public fullName: string = 'Order Pad UPR';

  public text: string =
    'Flip a coin. If heads, search your deck for an Item card, reveal it, and put it into your hand. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
