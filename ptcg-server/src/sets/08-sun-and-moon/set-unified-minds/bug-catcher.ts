import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, GameError } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';

import { COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class BugCatcher extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'UNM';
  public setNumber: string = '189';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Bug Catcher';
  public fullName: string = 'Bug Catcher UNM';

  public text: string = 'Draw 2 cards. Flip a coin. If heads, draw 2 more cards.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // Draw 2 cards
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 2, sourceCard: this });
      // Flip a coin for 2 more
      state = COIN_FLIP_PROMPT(store, state, player, (result) => {
        if (result) {
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 2, sourceCard: this });
        }
      });

      return state;
    }
    return state;
  }
}
