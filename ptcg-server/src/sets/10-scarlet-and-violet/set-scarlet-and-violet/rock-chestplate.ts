import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State, GamePhase } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { StateUtils, TrainerCard, pokemonHasCardTypeOptional } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class RockChestplate extends TrainerCard {
  public regulationMark = 'G';
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'SVI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '192';
  public name = 'Rock Chestplate';
  public fullName = 'Rock Chestplate SVI';

  public text =
    "The [F] Pokémon this card is attached to takes 30 less damage from attacks from your opponent's Pokémon (after applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Reduce damage by 30
    if (effect instanceof PutDamageEffect && effect.target.tools.includes(this)) {
      // It's not an attack
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      const player = StateUtils.findOwner(state, effect.target);
      const sourceCard = player.active.getPokemonCard();

      // Do not ignore self-damage
      const opponent = StateUtils.findOwner(state, effect.source);
      if (player === opponent) {
        return state;
      }

      if (pokemonHasCardTypeOptional(sourceCard, CardType.FIGHTING)) {
        // Check if damage target is owned by this card's owner
        const targetPlayer = StateUtils.findOwner(state, effect.target);
        if (targetPlayer === player) {
          effect.reduceDamage(30);
        }

        return state;
      }
      return state;
    }
    return state;
  }
}
