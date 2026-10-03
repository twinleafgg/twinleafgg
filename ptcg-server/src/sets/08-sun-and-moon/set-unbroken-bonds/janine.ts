import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, GameError, CardList } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import {SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: Janine,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  // Move to supporter zone, prevent default discard
  effect.preventDefault = true;
  MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: self });

  // Look at the top 4 cards
  const topCards = new CardList();
  const count = Math.min(4, player.deck.cards.length);
  MOVE_CARDS(store, state, player.deck, topCards, { count: count, sourceCard: self });

  // Choose 2 of them (or fewer if less than 4 available)
  const maxPick = Math.min(2, topCards.cards.length);

  let pickedCards: any[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      topCards,
      {},
      { min: maxPick, max: maxPick, allowCancel: false },
    ),
    (selected) => {
      pickedCards = selected || [];
      next();
    },
  );

  // Put chosen cards into hand
  MOVE_CARDS(store, state, topCards, player.hand, { cards: pickedCards, sourceCard: self });

  // Shuffle the remaining cards back into deck
  MOVE_CARDS(store, state, topCards, player.deck, { sourceCard: self });

  return SHUFFLE_DECK(store, state, player);
}

export class Janine extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'UNB';
  public setNumber: string = '176';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Janine';
  public fullName: string = 'Janine UNB';
  public text: string =
    'Look at the top 4 cards of your deck and put 2 of them into your hand. Shuffle the other cards back into your deck. You may play only 1 Supporter card during your turn (before your attack).';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      effect.player.playedJanine = true;

      const supporterTurn = effect.player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (effect.player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.playedJanine = false;
    }

    return state;
  }
}
