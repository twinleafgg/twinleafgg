import { Effect } from '../../game/store/effects/effect';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { GameError, GameMessage, CardList, ChooseCardsPrompt } from '../../game';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class UndergroundExpedition extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'SK';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '140';
  public name: string = 'Underground Expedition';
  public fullName: string = 'Underground Expedition SK';

  public text: string =
    'Look at the bottom 4 cards of your deck and put 2 of them into your hand. Put the other cards back on the bottom of your deck in any order.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      // Take the bottom 4 cards of the deck using slice
      const numBottom = Math.min(4, player.deck.cards.length);
      const bottomCards = player.deck.cards.slice(-numBottom);

      // Remove those cards from the deck
      player.deck.cards.splice(-numBottom, numBottom);

      const bottomCardList = new CardList();
      bottomCardList.cards = bottomCards;

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          bottomCardList,
          {},
          { min: 2, max: 2, allowCancel: false },
        ),
        (selected) => {
          // Put chosen cards into hand
          for (const card of selected) {
            MOVE_CARDS(store, state, bottomCardList, player.hand, {
              cards: [card],
              sourceCard: this,
            });
          }

          // The rest go back to the bottom of the deck
          while (bottomCardList.cards.length > 0) {
            MOVE_CARDS(store, state, bottomCardList, player.deck, {
              cards: [bottomCardList.cards[0]],
              sourceCard: this,
            });
          }

          return state;
        },
      );
    }
    return state;
  }
}
