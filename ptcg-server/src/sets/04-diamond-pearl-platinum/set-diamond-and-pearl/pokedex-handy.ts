import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { CardList } from '../../../game/store/state/card-list';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
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

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const deckTop = new CardList();
  MOVE_CARDS(store, state, player.deck, deckTop, { count: 2, sourceCard: effect.trainerCard });

  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      deckTop,
      {},
      { min: 1, max: 1, allowCancel: false },
    ),
    (selected) => {
      MOVE_CARDS(store, state, deckTop, player.hand, {
        cards: selected,
        sourceCard: effect.trainerCard,
      });
      MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: effect.trainerCard });
    },
  );
}

export class PokedexHandy extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'DP';

  public name: string = 'Pokedex HANDY910is';

  public fullName: string = 'Pokedex HANDY910is DP';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '111';

  public text: string =
    'Look at the top 2 cards of your deck, choose 1 of them, and put it into ' +
    'your hand. Put the other card on the bottom of your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
