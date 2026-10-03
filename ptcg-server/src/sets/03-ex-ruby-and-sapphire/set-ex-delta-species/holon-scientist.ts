import {
  Card,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  StateUtils,
} from '../../../game';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  DRAW_CARDS,
  DRAW_CARDS_UNTIL_CARDS_IN_HAND,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class HolonScientist extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  protected _tags = [CardTag.DELTA_SPECIES];
  public set: string = 'DS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '97';
  public name: string = 'Holon Scientist';
  public fullName: string = 'Holon Scientist DS';
  public text: string =
    "Discard a card from your hand. If you can't discard a card from your hand, you can't play this card.\n\nIf you have less cards in your hand than your opponent, draw cards until you have the same number of cards as your opponent.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      let cards: Card[] = [];
      cards = player.hand.cards.filter((c) => c !== effect.trainerCard);

      const hasCardInHand = player.hand.cards.some((c) => {
        return c instanceof Card;
      });
      if (!hasCardInHand) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (cards.length === 1) {
        MOVE_CARDS(store, state, player.hand, player.discard);
        DRAW_CARDS(store, state, player, opponent.hand.cards.length);
      }

      if (cards.length > 1) {
        state = store.prompt(
          state,
          new ChooseCardsPrompt(
            effect.player,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            player.hand,
            {},
            { allowCancel: false, min: 1, max: 1 },
          ),
          (cards) => {
            cards = cards || [];
            if (cards.length === 0) {
              return;
            }
            MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
            DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, opponent.hand.cards.length);
          },
        );
      }
      return state;
    }
    return state;
  }
}
