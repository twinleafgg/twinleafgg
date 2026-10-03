import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { Effect } from '../../game/store/effects/effect';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { StateUtils } from '../../game';
import { DRAW_CARDS, MOVE_CARDS, SHUFFLE_DECK } from '../../game/store/prefabs/prefabs';

export class ImpostorProfessorOak extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'BS';

  public name: string = 'Impostor Professor Oak';

  public fullName: string = 'Impostor Professor Oak BS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '73';

  public text: string =
    'Your opponent shuffles his or her hand into his or her deck, then draws 7 cards.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      MOVE_CARDS(store, state, opponent.hand, opponent.deck, { sourceCard: this });
      SHUFFLE_DECK(store, state, opponent);
      // Draw 7 cards for the opponent
      DRAW_CARDS(store, state, opponent, 7);

      // Discard the played Trainer card

      return state;
    }

    return state;
  }
}
