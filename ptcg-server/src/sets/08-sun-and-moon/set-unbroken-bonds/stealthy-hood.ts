import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  EffectOfAbilityEffect,
  PlaceDamageCountersEffect,
} from '../../../game/store/effects/game-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class StealthyHood extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public name: string = 'Stealthy Hood';
  public fullName: string = 'Stealthy Hood UNB';
  public set: string = 'UNB';
  public setNumber: string = '186';
  public cardImage: string = 'assets/cardback.png';
  public text: string =
    "Prevent all effects of your opponent's Abilities done to the Pokémon this card is attached to. Remove any such existing effects.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Prevent effects of abilities from opponent's Pokemon
    if (effect instanceof EffectOfAbilityEffect && effect.target) {
      const opponent = StateUtils.getOpponent(state, effect.player);

      if (IS_TOOL_BLOCKED(store, state, opponent, this)) {
        return state;
      }

      // Check for Stealthy Hood on the opposing side from the player using the ability
      if (
        opponent.getPokemonInPlay().includes(effect.target) &&
        effect.target.tools.includes(this)
      ) {
        effect.target = undefined;
      }
    }

    if (effect instanceof PlaceDamageCountersEffect && effect.target.tools.includes(this)) {
      effect.preventDefault = true;
    }
    return state;
  }
}
