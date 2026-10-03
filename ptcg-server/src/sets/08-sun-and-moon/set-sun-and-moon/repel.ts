import { GameError, GameMessage, StateUtils } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { SWITCH_OUT_OPPONENT_ACTIVE_POKEMON } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class Repel extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'SUM';
  public name: string = 'Repel';
  public fullName: string = 'Repel SUM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '130';
  public text: string =
    'Your opponent switches their Active Pokémon with 1 of their Benched Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const opponentHasBench = opponent.bench.some((b) => b.cards.length > 0);

      if (!opponentHasBench) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Legacy implementation:
      // - Prompted opponent to choose their Benched replacement Active.
      // - Switched opponent Active to that target.
      //
      // Converted to prefab version (SWITCH_OUT_OPPONENT_ACTIVE_POKEMON).
      SWITCH_OUT_OPPONENT_ACTIVE_POKEMON(store, state, player, { allowCancel: false });
    }

    return state;
  }
}
