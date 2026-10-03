import {
  Card,
  CardList,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  OrderCardsPrompt,
  ShowCardsPrompt,
  State,
  StateUtils,
  StoreLike,
  TrainerCard,
  TrainerType,
} from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { TrainerEffect, TrainerToDeckEffect } from '../../game/store/effects/play-card-effects';

import { COIN_FLIP_PROMPT, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class Recycle extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'FO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '61';
  public name: string = 'Recycle';
  public fullName: string = 'Recycle FO';

  public text: string =
    'Flip a coin. If heads, put a card in your discard pile on top of your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let cards: Card[] = [];

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      return COIN_FLIP_PROMPT(store, state, player, (results) => {
        if (results) {
          const deckTop = new CardList();

          store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARDS_TO_PUT_ON_TOP_OF_THE_DECK,
              player.discard,
              {},
              { min: 1, max: 1, allowCancel: false },
            ),
            (selected) => {
              cards = selected || [];

              const trainerCards = cards.filter((card) => card instanceof TrainerCard);
              const nonTrainerCards = cards.filter((card) => !(card instanceof TrainerCard));

              let canMoveTrainerCards = true;
              if (trainerCards.length > 0) {
                const discardEffect = new TrainerToDeckEffect(player, this);
                store.reduceEffect(state, discardEffect);
                canMoveTrainerCards = !discardEffect.preventDefault;
              }

              const cardsToMove = canMoveTrainerCards ? cards : nonTrainerCards;

              if (cardsToMove.length > 0) {
                cardsToMove.forEach((card) => {
                  MOVE_CARDS(store, state, player.discard, deckTop, {
                    cards: [card],
                    sourceCard: this,
                  });
                });

                return store.prompt(
                  state,
                  new OrderCardsPrompt(player.id, GameMessage.CHOOSE_CARDS_ORDER, deckTop, {
                    allowCancel: false,
                  }),
                  (order) => {
                    if (order === null) {
                      return state;
                    }

                    deckTop.applyOrder(order);
                    deckTop.moveToTopOfDestination(player.deck);

                    if (cardsToMove.length > 0) {
                      return store.prompt(
                        state,
                        new ShowCardsPrompt(
                          opponent.id,
                          GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                          cardsToMove,
                        ),
                        () => state,
                      );
                    }

                    return state;
                  },
                );
              }

              return state;
            },
          );
        }
      });
    }

    return state;
  }
}
