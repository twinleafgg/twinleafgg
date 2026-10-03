import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { StateUtils } from '../../../game/store/state-utils';
import { GameError, GameMessage } from '../../../game';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: Copycat,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  const cards = player.hand.cards.filter((c) => c !== self);
  const supporterTurn = player.supporterTurn;

  if (supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: self });
  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  if (cards.length > 0) {
    MOVE_CARDS(store, state, player.hand, player.deck, { cards, sourceCard: self });

    yield store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
      player.deck.applyOrder(order);
      next();
    });
  }

  const cardsNumber = opponent.hand.cards.length;
  DRAW_CARDS(store, state, player, cardsNumber);
  return state;
}

export class Copycat extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'CES';

  public name: string = 'Copycat';

  public fullName: string = 'Copycat CES';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '127';

  public text: string =
    'Shuffle your hand into your deck. Then, draw a card for each card in ' +
    "your opponent's hand.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    return state;
  }
}
