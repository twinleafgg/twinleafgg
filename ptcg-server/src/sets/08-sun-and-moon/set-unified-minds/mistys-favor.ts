import { Card } from '../../../game/store/card/card';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType } from '../../../game/store/card/card-types';
import { ShowCardsPrompt, StateUtils } from '../../../game';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  let cards: Card[] = [];

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
      { min: 0, max: 3, allowCancel: false },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );
  MOVE_CARDS(store, state, player.deck, player.hand, {
    cards: cards,
    sourceCard: effect.trainerCard,
  });

  const opponent = StateUtils.getOpponent(state, player);

  if (cards.length > 0) {
    yield store.prompt(
      state,
      new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
      () => next(),
    );
  }

  MOVE_CARDS(store, state, player.deck, player.hand, {
    cards: cards,
    sourceCard: effect.trainerCard,
  });

  store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class MistysFavor extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'UNM';

  public setNumber = '202';

  public cardImage = 'assets/cardback.png';

  public name: string = "Misty's Favor";

  public fullName: string = "Misty's Favor UNM";

  public text: string =
    'Search your deck for up to 3 Supporters, reveal them, and put them into your hand. Then, shuffle your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
