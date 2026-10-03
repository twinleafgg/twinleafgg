import { GameError, GameMessage } from '../../game';
import { TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Effect } from '../../game/store/effects/effect';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import {
  DRAW_CARDS,
  MULTIPLE_COIN_FLIPS_PROMPT,
  SEARCH_DECK_FOR_CARDS_TO_HAND,
} from '../../game/store/prefabs/prefabs';

export class VictoryMedal extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'UP';
  public name: string = 'Victory Medal';
  public fullName: string = 'Victory Medal UP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'Victory Medal';

  public text: string =
    'Flip 2 coins. If one of them is heads, draw a card. If both are heads, search your deck for any 1 card, put it into your hand, and shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, (coinResults) => {
        if (coinResults.every((r) => r === true)) {
          SEARCH_DECK_FOR_CARDS_TO_HAND(
            store,
            state,
            player,
            this,
            {},
            { min: 1, max: 1, allowCancel: false },
          );
          return state;
        } else if (coinResults.some((r) => r === true)) {
          DRAW_CARDS(store, state, player, 1);
          return state;
        }
        return state;
      });
    }
    return state;
  }
}
