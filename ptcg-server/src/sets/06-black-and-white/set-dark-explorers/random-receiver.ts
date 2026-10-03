import { Card } from '../../../game/store/card/card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ShowCardsPrompt } from '../../../game/store/prompts/show-cards-prompt';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

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

  const cards: Card[] = [];
  let supporter: Card | undefined;
  for (let i = 0; i < player.deck.cards.length; i++) {
    const card = player.deck.cards[i];
    cards.push(card);

    if (card instanceof TrainerCard && card.trainerType === TrainerType.SUPPORTER) {
      supporter = card;
      break;
    }
  }

  yield store.prompt(
    state,
    [
      new ShowCardsPrompt(player.id, GameMessage.CARDS_SHOWED_BY_EFFECT, cards),
      new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
    ],
    () => next(),
  );

  if (supporter !== undefined) {
    MOVE_CARDS(store, state, player.deck, player.hand, {
      cards: [supporter],
      sourceCard: effect.trainerCard,
      sourceEffect: effect.trainerCard,
    });
  }
  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class RandomReceiver extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'DEX';

  public name: string = 'Random Receiver';

  public fullName: string = 'Random Receiver DEX';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '99';

  public text: string =
    'Reveal cards from the top of your deck until you reveal a Supporter ' +
    'card. Put it into your hand. Shuffle the other cards back into your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
