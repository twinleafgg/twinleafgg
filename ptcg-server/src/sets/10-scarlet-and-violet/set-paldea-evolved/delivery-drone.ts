import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { GameMessage } from '../../../game/game-message';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';

import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { Effect } from '../../../game/store/effects/effect';
import { Player } from '../../../game';

import { COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  let coin1Result = false;
  let coin2Result = false;

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  yield COIN_FLIP_PROMPT(store, state, player, (result) => {
    coin1Result = result;
    next();
  });
  yield COIN_FLIP_PROMPT(store, state, player, (result) => {
    coin2Result = result;
    next();
  });
  if (coin1Result && coin2Result) {
    let cards: any[] = [];
    yield store.prompt(
      state,
      new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        {},
        { min: 0, max: 1, allowCancel: false },
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

export class DeliveryDrone extends TrainerCard {
  public regulationMark = 'G';

  protected _trainerType = TrainerType.ITEM;

  public set = 'PAL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '178';
  public name = 'Delivery Drone';
  public fullName: string = 'Delivery Drone PAL';

  public text: string =
    'Flip 2 coins. If both of them are heads, search your deck for a card and put it into your hand. Then, shuffle your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return player.deck.cards.length > 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
