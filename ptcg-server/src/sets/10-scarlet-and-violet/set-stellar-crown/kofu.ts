import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { Card, CardList, OrderCardsPrompt, Player } from '../../../game';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  let cards: Card[] = [];

  const supporterTurn = player.supporterTurn;
  if (supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  if (player.hand.cards.length <= 2) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const deckBottom = new CardList();

  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARDS_TO_PUT_ON_BOTTOM_OF_THE_DECK,
      player.hand,
      {},
      { allowCancel: false, min: 2, max: 2 },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  MOVE_CARDS(store, state, player.hand, deckBottom, {
    cards: cards,
    sourceCard: effect.trainerCard,
  });

  return store.prompt(
    state,
    new OrderCardsPrompt(player.id, GameMessage.CHOOSE_CARDS_ORDER, deckBottom, {
      allowCancel: false,
    }),
    (order) => {
      if (order === null) {
        return state;
      }

      deckBottom.applyOrder(order);
      MOVE_CARDS(store, state, deckBottom, player.deck, { sourceCard: effect.trainerCard });

      MOVE_CARDS(store, state, player.deck, player.hand, {
        count: Math.min(4, player.deck.cards.length),
        sourceCard: effect.trainerCard,
      });
    },
  );
}

export class Kofu extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public regulationMark = 'H';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '138';

  public set: string = 'SCR';

  public name: string = 'Kofu';

  public fullName: string = 'Kofu SCR';

  public text: string =
    "Put 2 cards from your hand on the bottom of your deck in any order. If you put 2 cards on the bottom of your deck in this way, draw 4 cards. (If you can't put 2 cards from your hand on the bottom of your deck, you can't use this card.)";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    if (player.hand.cards.length <= 2) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
