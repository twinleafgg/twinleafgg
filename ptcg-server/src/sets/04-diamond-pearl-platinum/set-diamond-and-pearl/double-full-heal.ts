import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class DoubleFullHeal extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'DP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '105';
  public name: string = 'Double Full Heal';
  public fullName: string = 'Double Full Heal DP';
  public text: string = 'Remove all Special Conditions from each of your Active Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.hand, player.discard, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;
      const conditions = player.active.specialConditions.slice();
      conditions.forEach(condition => {
        player.active.removeSpecialCondition(condition);
      });
    }

    return state;
  }
}
