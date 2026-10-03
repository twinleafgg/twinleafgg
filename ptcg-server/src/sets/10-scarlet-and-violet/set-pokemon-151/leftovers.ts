import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';

export class Leftovers extends TrainerCard {
  public regulationMark = 'G';

  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'MEW';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '163';

  public name: string = 'Leftovers';

  public fullName: string = 'Leftovers MEW';

  public text: string =
    'At the end of your turn, if the Pokémon this card is attached to is in the Active Spot, heal 20 damage from it.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect && effect.player.active.tools.includes(this)) {
      const player = effect.player;

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      const healEffect = new HealEffect(player, player.active, 20);
      store.reduceEffect(state, healEffect);
    }

    return state;
  }
}
