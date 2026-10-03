import {
  TrainerCard,
  TrainerType,
  StoreLike,
  State,
  StateUtils,
  ChooseCardsPrompt,
  GameMessage,
  GameError,
  CardList,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  SHOW_CARDS_TO_PLAYER,
  MOVE_CARD_TO,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';

export class MarleysRequest extends TrainerCard {
  protected _trainerType = TrainerType.SUPPORTER;
  public cardImage: string = 'assets/cardback.png';
  public set = 'SF';
  public setNumber: string = '87';
  public name = "Marley's Request";
  public fullName = "Marley's Request SF";

  public text =
    'Search your discard pile for 2 different Trainer, Supporter, or Stadium cards, show them to your opponent, and your opponent chooses 1 of them. Put that card into your hand, and discard the other card. (If all Trainer, Supporter, and Stadium cards in your discard pile have the same name, choose 1 of them. Show that card to your opponent and put it into your hand.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [this], sourceCard: this });

      const blocked: number[] = [];
      const notBlocked: CardList = new CardList();
      player.discard.cards.forEach((c, index) => {
        const isItem = c instanceof TrainerCard && c.trainerType === TrainerType.ITEM;
        const isSupporter = c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER;
        const isStadium = c instanceof TrainerCard && c.trainerType === TrainerType.STADIUM;
        if (!(isItem || isSupporter || isStadium)) {
          blocked.push(index);
        } else {
          notBlocked.cards.push(c);
        }
      });

      if (notBlocked.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      effect.preventDefault = true;

      if (
        notBlocked.cards.length === 1 ||
        notBlocked.cards.every((card) => card.name === notBlocked.cards[0].name)
      ) {
        state = store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.discard,
            {},
            { min: 1, max: 1, allowCancel: false, blocked },
          ),
          (cards) => {
            SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
            cards.forEach((card) => MOVE_CARD_TO(state, card, player.hand));
            MOVE_CARDS(store, state, player.supporter, player.discard, {
              cards: [this],
              sourceCard: this,
            });
          },
        );
      } else {
        state = store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.discard,
            {},
            { min: 2, max: 2, allowCancel: false, blocked },
          ),
          (cards) => {
            if (cards[0].name === cards[1].name) {
              throw new GameError(GameMessage.CHOOSE_CARDS);
            }

            const chosenCards = new CardList();
            cards.forEach((card) => chosenCards.cards.push(card));
            state = store.prompt(
              state,
              new ChooseCardsPrompt(
                opponent,
                GameMessage.CHOOSE_CARD_TO_HAND,
                chosenCards,
                {},
                { min: 1, max: 1, allowCancel: false },
              ),
              (card) => {
                MOVE_CARD_TO(state, card[0], player.hand);
                MOVE_CARDS(store, state, player.supporter, player.discard, {
                  cards: [this],
                  sourceCard: this,
                });
              },
            );
          },
        );
      }
    }

    return state;
  }
}
