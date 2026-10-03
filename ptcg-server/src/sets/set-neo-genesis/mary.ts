import { Effect } from '../../game/store/effects/effect';
import { GameMessage } from '../../game/game-message';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { DRAW_CARDS, MOVE_CARDS } from '../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt, ShuffleDeckPrompt } from '../../game';

export class Mary extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'N1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '87';
  public name: string = 'Mary';
  public fullName: string = 'Mary N1';

  public text: string = 'Draw 2 cards. Then, shuffle 2 cards from your hand into your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const cardsToDraw = Math.min(2, player.deck.cards.length);
      DRAW_CARDS(store, state, player, cardsToDraw);

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_SHUFFLE,
          player.hand,
          {},
          { allowCancel: false, min: 2, max: 2 },
        ),
        (selected) => {
          selected.forEach((card) => {
            MOVE_CARDS(store, state, player.hand, player.deck, { cards: [card], sourceCard: this });
          });
          state = store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
    }
    return state;
  }
}
