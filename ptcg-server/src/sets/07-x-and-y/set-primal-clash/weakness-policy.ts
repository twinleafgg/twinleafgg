import { StateUtils } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckPokemonStatsEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class WeaknessPolicy extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'PRC';
  public name: string = 'Weakness Policy';
  public fullName: string = 'Weakness Policy PRC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '142';

  public text: string = 'The Pokémon this card is attached to has no Weakness.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckPokemonStatsEffect && effect.target.tools.includes(this)) {
      const player = StateUtils.findOwner(state, effect.target);
      if (!IS_TOOL_BLOCKED(store, state, player, this)) {
        const target = effect.target.getPokemonCard();
        if (target) {
          effect.weakness = [];
        }
      }
    }

    return state;
  }
}
