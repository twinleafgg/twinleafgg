import { TrainerCard, TrainerType, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';

export class Cook extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'FST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '228';

  public regulationMark = 'E';

  public name: string = 'Cook';

  public fullName: string = 'Cook FST';

  public text = 'Heal 70 damage from your Active Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect) {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const healEffect = new HealEffect(effect.player, effect.player.active, 70);
      return store.reduceEffect(state, healEffect);
    }
    return state;
  }
}
