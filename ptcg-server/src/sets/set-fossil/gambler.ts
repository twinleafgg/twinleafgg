import { ShuffleDeckPrompt, State, StoreLike, TrainerCard, TrainerType } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';

import { COIN_FLIP_PROMPT, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class Gambler extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'FO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '60';
  public name: string = 'Gambler';
  public fullName: string = 'Gambler FO';

  public text: string =
    'Shuffle your hand into your deck. Flip a coin. If heads, draw 8 cards. If tails, draw 1 card.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const cards = player.hand.cards.filter((c) => c !== this);

      MOVE_CARDS(store, state, player.hand, player.deck, { cards: cards, sourceCard: this });
      store.prompt(state, [new ShuffleDeckPrompt(player.id)], (deckOrder) => {
        player.deck.applyOrder(deckOrder);

        MOVE_CARDS(store, state, player.deck, player.hand, { count: 4, sourceCard: this });
      });
      state = COIN_FLIP_PROMPT(store, state, player, (results) => {
        if (results) {
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 8, sourceCard: this });
        } else {
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
        }
      });
      return state;
    }

    return state;
  }
}
