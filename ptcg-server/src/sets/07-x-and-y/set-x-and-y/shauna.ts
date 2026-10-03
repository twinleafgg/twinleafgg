import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { SHUFFLE_HAND_INTO_DECK_THEN_DRAW } from '../../../game/store/prefabs/prefabs';

export class Shauna extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'XY';

  public name: string = 'Shauna';

  public fullName: string = 'Shauna XY';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '127';

  public text: string = 'Shuffle your hand into your deck. Then, draw 5 cards.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      return SHUFFLE_HAND_INTO_DECK_THEN_DRAW(store, state, effect.player, {
        excludeCard: this,
        drawCount: 5,
      });
    }

    return state;
  }
}
