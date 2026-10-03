import { CardList, GameMessage, OrderCardsPrompt } from '../../game';
import { TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Effect } from '../../game/store/effects/effect';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class Pokedex extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'BS'; // Replace with the appropriate set abbreviation

  public name: string = 'Pokedéx';

  public fullName: string = 'Pokedex BS'; // Replace with the appropriate set abbreviation

  public cardImage: string = 'assets/cardback.png'; // Replace with the appropriate card image path

  public setNumber: string = '87'; // Replace with the appropriate set number

  public text: string =
    'Look at up to 5 cards from the top of your deck and rearrange them as you like.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const deck = player.deck;

      const deckTop = new CardList();

      // Get up to 5 cards from the top of the deck
      const cards = deck.cards.slice(0, 5);
      MOVE_CARDS(store, state, player.deck, deckTop, { cards: cards, sourceCard: this });

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      return store.prompt(
        state,
        new OrderCardsPrompt(player.id, GameMessage.CHOOSE_CARDS_ORDER, deckTop, {
          allowCancel: false,
        }),
        (rearrangedCards) => {
          if (rearrangedCards === null) {
            return state;
          }

          deckTop.applyOrder(rearrangedCards);
          MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: this });
        },
      );
    }

    return state;
  }
}
