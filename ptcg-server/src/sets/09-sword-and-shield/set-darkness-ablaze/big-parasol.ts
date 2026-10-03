import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import {
  AbstractAttackEffect,
  ApplyWeaknessEffect,
  DealDamageEffect,
  PutDamageEffect,
} from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class BigParasol extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'DAA';
  public name: string = 'Big Parasol';
  public fullName: string = 'Big Parasol DAA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '157';

  public text: string =
    "As long as the Pokémon this card is attached to is in the Active Spot, prevent all effects of attacks from your opponent's Pokémon done to all of your Pokémon. (Existing effects are not removed. Damage is not an effect.)";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AbstractAttackEffect) {
      const player = StateUtils.findOwner(state, effect.target);

      if (player.active.tools.includes(this) && !IS_TOOL_BLOCKED(store, state, player, this)) {
        const sourceCard = effect.source.getPokemonCard();

        if (sourceCard) {
          // Check if the effect targets the player's active or benched Pokémon
          const isTargetingActive = effect.target === player.active;
          const isTargetingBench = player.bench.includes(effect.target);

          if (isTargetingActive || isTargetingBench) {
            // Allow Weakness & Resistance           NOT WORKING???
            if (effect instanceof ApplyWeaknessEffect) {
              return state;
            }
            // Allow damage
            if (effect instanceof PutDamageEffect) {
              return state;
            }
            // Allow damage
            if (effect instanceof DealDamageEffect) {
              return state;
            }

            effect.preventDefault = true;
          }
        }
      }
    }

    return state;
  }
}
