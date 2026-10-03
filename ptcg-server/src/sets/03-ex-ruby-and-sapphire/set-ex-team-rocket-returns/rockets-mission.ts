import {
  Card,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  PokemonCard,
} from '../../../game';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class RocketsMission extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'TRR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '88';
  public name: string = "Rocket's Mission";
  public fullName: string = "Rocket's Mission TRR";

  public text: string =
    "Discard a card from your hand. Then, draw 3 cards. If you discarded a Pokémon that has Dark or Rocket's in its name, draw 4 cards instead.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

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

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      if (cards.length == 1) {
        MOVE_CARDS(store, state, player.hand, player.discard, { cards: player.hand.cards, sourceCard: this });
        let cardsToDraw = 3;

        if (
          cards[0] instanceof PokemonCard &&
          (cards[0].hasTag(CardTag.ROCKETS) || cards[0].hasTag(CardTag.DARK))
        ) {
          cardsToDraw = 4;
        }
        DRAW_CARDS(store, state, player, cardsToDraw);
        return state;
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
            let cardsToDraw = 3;

            if (
              cards[0] instanceof PokemonCard &&
              (cards[0].hasTag(CardTag.ROCKETS) || cards[0].hasTag(CardTag.DARK))
            ) {
              cardsToDraw = 4;
            }

            MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

            DRAW_CARDS(store, state, player, cardsToDraw);
          },
        );
      }
      return state;
    }

    return state;
  }
}
