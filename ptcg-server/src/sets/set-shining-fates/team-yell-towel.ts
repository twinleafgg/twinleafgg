import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { HealEffect } from '../../game/store/effects/game-effects';
import { TRAINER_TARGET_BLOCKED } from '../../game/store/prefabs/prefabs';

export class TeamYellTowel extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public regulationMark: string = 'D';
  public set: string = 'SHF';
  public setNumber: string = '63';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Team Yell Towel';
  public fullName: string = 'Team Yell Towel SHF';
  public text: string = 'Heal 50 damage from both Active Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Heal player's active
      const healPlayer = new HealEffect(player, player.active, 50);
      store.reduceEffect(state, healPlayer);

      // Heal opponent's active
      if (!TRAINER_TARGET_BLOCKED(store, state, player, this, opponent.active)) {
        const healOpponent = new HealEffect(player, opponent.active, 50);
        store.reduceEffect(state, healOpponent);
      }
    }

    return state;
  }
}
