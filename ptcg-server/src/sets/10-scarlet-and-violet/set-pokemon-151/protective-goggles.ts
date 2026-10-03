import { StateUtils } from '../../../game';
import { Stage, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckPokemonStatsEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class ProtectiveGoggles extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'MEW';
  public name: string = 'Protective Goggles';
  public fullName: string = 'Protective Goggles MEW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '164';

  public text: string = 'The Basic Pokémon this card is attached to has no Weakness.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckPokemonStatsEffect && effect.target.tools.includes(this)) {
      const player = StateUtils.findOwner(state, effect.target);
      if (!IS_TOOL_BLOCKED(store, state, player, this)) {
        const target = effect.target.getPokemonCard();
        if (target?.stage === Stage.BASIC) {
          effect.weakness = [];
        }
      }
    }

    return state;
  }
}
