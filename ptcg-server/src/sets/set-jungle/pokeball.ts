import { TrainerCard } from '../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../game/store/card/card-types';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { GameMessage } from '../../game/game-message';
import { ChooseCardsPrompt } from '../../game/store/prompts/choose-cards-prompt';
import { ShuffleDeckPrompt } from '../../game/store/prompts/shuffle-prompt';

import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { Effect } from '../../game/store/effects/effect';
import { ShowCardsPrompt, StateUtils } from '../../game';

import { COIN_FLIP_PROMPT, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  let coinResult = false;

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  yield COIN_FLIP_PROMPT(store, state, player, (result) => {
    coinResult = result;
    next();
  });

  if (coinResult) {
    let cards: any[] = [];
    yield store.prompt(
      state,
      new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.POKEMON },
        { min: 0, max: 1, allowCancel: false },
      ),
      (selected: any[]) => {
        cards = selected || [];
        next();
      },
    );

    if (cards.length > 0) {
      MOVE_CARDS(store, state, player.discard, player.deck, {
        cards: cards,
        sourceCard: effect.trainerCard,
      });
      if (cards.length > 0) {
        state = store.prompt(
          state,
          new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
          () => state,
        );
      }
    }

    MOVE_CARDS(store, state, player.deck, player.hand, {
      cards: cards,
      sourceCard: effect.trainerCard,
    });
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order: any[]) => {
    player.deck.applyOrder(order);
  });
}

export class PokeBall extends TrainerCard {
  protected _trainerType = TrainerType.ITEM;

  public regulationMark = 'G';

  public set = 'JU';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '64';
  public name = 'Poké Ball';
  public fullName: string = 'Poké Ball JU';

  public text: string =
    'Flip a coin. If heads, you may search your deck for any Basic Pokémon or Evolution card. Show that card to your opponent, then put it into your hand. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
