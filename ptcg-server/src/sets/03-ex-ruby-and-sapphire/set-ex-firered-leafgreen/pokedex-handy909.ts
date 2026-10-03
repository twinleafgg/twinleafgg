import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { CardList, GameMessage, GameError, OrderCardsPrompt } from '../../../game';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class PokeDexHANDY909 extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'RG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '96';
  public name: string = 'PokéDex HANDY909';
  public fullName: string = 'PokéDex HANDY909 RG';

  public text: string =
    'Shuffle your deck. Look at 6 cards from the top of your deck, then put them back on top of your deck in any order.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      SHUFFLE_DECK(store, state, player);

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 6, sourceCard: this });

      store.prompt(
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

      MOVE_CARDS(store, state, player.supporter, player.discard, { cards: [this], sourceCard: this });
    }
    return state;
  }
}
