import {
  CardList,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { CardTag, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DISCARD_X_CARDS_FROM_YOUR_HAND } from '../../../game/store/prefabs/trainer-prefabs';

export class HolonLass extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  protected _tags = [CardTag.DELTA_SPECIES];
  public set: string = 'DS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '92';
  public name: string = 'Holon Lass';
  public fullName: string = 'Holon Lass DS';

  public text: string =
    "Discard a card from your hand. If you can't discard a card from your hand, you can't play this card.\n\nCount the total number of Prize cards left(both yours and your opponent's). Look at that many cards from the top of your deck, choose as many Energy cards as you like, show them to your opponent, and put them into your hand. Put the other cards back on top of your deck. Shuffle your deck afterward.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      DISCARD_X_CARDS_FROM_YOUR_HAND(effect, store, state, 1, 1);

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const temp = new CardList();

      // Count total Prize cards left
      const totalPrizes = player.getPrizeLeft() + opponent.getPrizeLeft();
      MOVE_CARDS(store, state, player.deck, temp, { count: totalPrizes, sourceCard: this });

      // Count how many Energy cards are in temp
      const energyCount = temp.cards.filter((card) => card.superType === SuperType.ENERGY).length;

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          temp,
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 0, max: energyCount },
        ),
        (chosenCards) => {
          if (chosenCards.length === 0) {
            // No Energy chosen, shuffle all back
            temp.cards.forEach((card) => {
              MOVE_CARDS(store, state, temp, player.deck, { cards: [card], sourceCard: this });
            });
          } else {
            // Move chosen Energy to hand
            chosenCards.forEach((card) => {
              MOVE_CARDS(store, state, temp, player.hand, { cards: [card], sourceCard: this });
            });

            if (chosenCards.length > 0) {
              SHOW_CARDS_TO_PLAYER(store, state, opponent, chosenCards);
            }
            MOVE_CARDS(store, state, temp, player.deck, { sourceCard: this });
          }

          SHUFFLE_DECK(store, state, player);
        },
      );
    }

    return state;
  }
}
