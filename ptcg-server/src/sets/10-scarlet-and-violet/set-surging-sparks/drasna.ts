import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { Player } from '../../../game';
import {
  COIN_FLIP_PROMPT,
  DRAW_CARDS,
  SHUFFLE_HAND_INTO_DECK_THEN_DRAW,
} from '../../../game/store/prefabs/prefabs';

export class Drasna extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'SSP';
  public setNumber = '173';
  public cardImage = 'assets/cardback.png';

  public regulationMark: string = 'H';

  public name: string = 'Drasna';
  public fullName: string = 'Drasna SSP';

  public text: string =
    'Shuffle your hand into your deck. Then, flip a coin. If heads, draw 8 cards. If tails, draw 3 cards.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      return SHUFFLE_HAND_INTO_DECK_THEN_DRAW(store, state, effect.player, {
        excludeCard: this,
        resolveDraw: (store, state, player) => {
          COIN_FLIP_PROMPT(store, state, player, (result) => {
            DRAW_CARDS(store, state, player, result ? 8 : 3);
          });
        },
      });
    }

    return state;
  }
}
