import { CardList, GameError, GameMessage, OrderCardsPrompt } from '../../game';
import { TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Effect } from '../../game/store/effects/effect';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class VictoryOrb extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'UP'; // Replace with the appropriate set abbreviation
  public name: string = 'Victory Orb';
  public fullName: string = 'Victory Orb UP'; // Replace with the appropriate set abbreviation
  public cardImage: string = 'assets/cardback.png'; // Replace with the appropriate card image path
  public setNumber: string = 'Victory Orb'; // Replace with the appropriate set number
  public text: string =
    'Victory Orb can only be used by official tournament winners.\n\nLook at 7 cards from the top of your deck, rearrange them in any order you like, and put them back on top of the deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 7, sourceCard: this });

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
        },
      );
    }
    return state;
  }
}
