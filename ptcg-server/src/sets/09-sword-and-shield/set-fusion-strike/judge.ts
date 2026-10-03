import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StateUtils } from '../../../game/store/state-utils';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { GameMessage } from '../../../game/game-message';
import { GameError } from '../../../game';
import { SHUFFLE_HAND_INTO_DECK_THEN_DRAW } from '../../../game/store/prefabs/prefabs';

export class Judge extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'FST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '235';

  public regulationMark = 'E';

  public name: string = 'Judge';

  public fullName: string = 'Judge FST';

  public text: string = 'Each player shuffles their hand into their deck and draws 4 cards.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (
        player.hand.cards.filter((c) => c !== this).length === 0 &&
        player.deck.cards.length === 0
      ) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      return SHUFFLE_HAND_INTO_DECK_THEN_DRAW(store, state, player, {
        excludeCard: this,
        sourceCard: this,
        drawCount: 4,
        afterDraw: () => {
          SHUFFLE_HAND_INTO_DECK_THEN_DRAW(store, state, opponent, {
            sourceCard: this,
            drawCount: 4,
          });
        },
      });
    }

    return state;
  }
}
