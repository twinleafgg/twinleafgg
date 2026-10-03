import { TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Effect } from '../../game/store/effects/effect';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';

export class FullHeal extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'EX';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '154';
  public name: string = 'Full Heal';
  public fullName: string = 'Full Heal EX';

  public text: string = 'Remove all Special Conditions from your Active Pokémon.';

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
