import { Card, ChooseCardsPrompt, GameMessage } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  BLOCK_IF_DECK_EMPTY,
  DRAW_CARDS_UNTIL_CARDS_IN_HAND,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class Sightseer extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'LOT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '189';

  public name: string = 'Sightseer';

  public fullName: string = 'Sightseer LOT';

  public text: string =
    'You may discard any number of cards from your hand. Then, draw cards until you have 5 cards in your hand. ' +
    "If you can't draw any cards in this way, you can't play this card.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      BLOCK_IF_DECK_EMPTY(player);
      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          {
            min: Math.max(0, player.hand.cards.length - 4),
            max: player.hand.cards.length,
            allowCancel: false,
          },
        ),
        (selected) => {
          const cards: Card[] = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.hand, player.discard, { cards });
          }
          DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, 5);
        },
      );
    }

    return state;
  }
}
