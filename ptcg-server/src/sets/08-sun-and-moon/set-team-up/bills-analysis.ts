import { CardList, ChooseCardsPrompt, ShowCardsPrompt, StateUtils } from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: BillsAnalysis,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  const supporterTurn = player.supporterTurn;

  if (supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  MOVE_CARDS(store, state, player.hand, player.supporter, {
    cards: [effect.trainerCard],
    sourceCard: self,
  });
  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  const deckTop = new CardList();
  MOVE_CARDS(store, state, player.deck, deckTop, { count: 7, sourceCard: self });

  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      deckTop,
      { superType: SuperType.TRAINER },
      { min: 0, max: 2, allowCancel: false },
    ),
    (selected) => {
      MOVE_CARDS(store, state, deckTop, player.hand, { cards: selected, sourceCard: self });
      MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: self });

      const opponent = StateUtils.getOpponent(state, player);

      if (selected.length > 0) {
        store.prompt(
          state,
          new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, selected),
          () => next(),
        );
      }

      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
        return state;
      });
    },
  );
}

export class BillsAnalysis extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'TEU';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '133';

  public name: string = "Bill's Analysis";

  public fullName: string = "Bill's Analysis TEU";

  public text: string =
    'Look at the top 7 cards of your deck. You may reveal up to 2 Trainer cards you find there and put them into your hand. Shuffle the other cards back into your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    return state;
  }
}
