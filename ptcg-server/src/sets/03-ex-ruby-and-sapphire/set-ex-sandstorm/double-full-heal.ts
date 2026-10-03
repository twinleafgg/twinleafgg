import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class DoubleFullHeal extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'SS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '86';
  public name: string = 'Double Full Heal';
  public fullName: string = 'Double Full Heal SS';

  public text: string = 'Remove all Special Conditions from each of your Active Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      effect.preventDefault = true;

      const conditions = player.active.specialConditions.slice();
      conditions?.forEach((condition) => {
        player.active.removeSpecialCondition(condition);
      });
    }

    return state;
  }
}
