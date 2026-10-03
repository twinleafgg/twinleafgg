import { GameMessage } from '../../../game/game-message';
import { Card } from '../../../game/store/card/card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShowCardsPrompt } from '../../../game/store/prompts/show-cards-prompt';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { StateUtils } from '../../../game/store/state-utils';
import { CardList } from '../../../game/store/state/card-list';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  const deckTop = new CardList();
  MOVE_CARDS(store, state, player.deck, deckTop, { count: 4, sourceCard: effect.trainerCard });

  effect.preventDefault = true;
  MOVE_CARDS(store, state, player.hand, player.supporter, {
    cards: [effect.trainerCard],
    sourceCard: effect.trainerCard,
  });

  const blocked: number[] = [];
  deckTop.cards.forEach((card, index) => {
    if (card instanceof TrainerCard && card.name === "Trainers' Mail") {
      blocked.push(index);
    }
  });

  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      deckTop,
      { superType: SuperType.TRAINER },
      { min: 1, max: 1, allowCancel: true, blocked },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  MOVE_CARDS(store, state, deckTop, player.hand, { cards: cards, sourceCard: effect.trainerCard });
  MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: effect.trainerCard });

  if (cards.length > 0) {
    yield store.prompt(
      state,
      new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
      () => next(),
    );
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class TrainersMail extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'ROS';

  public name: string = "Trainers' Mail";

  public fullName: string = "Trainers' Mail ROS";

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '92';

  public text: string =
    'Look at the top 4 cards of your deck. You may reveal a Trainer card ' +
    "you find there (except for Trainers' Mail) and put it into your hand. " +
    'Shuffle the other cards back into your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
