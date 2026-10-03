import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

import { GamePhase, State } from '../../../game/store/state/state';

import { StoreLike } from '../../../game/store/store-like';

export class MetalFryingPan extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'FLI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '112';

  public name: string = 'Metal Frying Pan';

  public fullName: string = 'Metal Frying Pan FLI';

  public text: string =
    "The [M] Pokémon this card is attached to takes 30 less damage from your opponent's attacks (after applying Weakness and Resistance) and has no Weakness.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PutDamageEffect && effect.target.tools.includes(this)) {
      //const sourceCard = effect.target.getPokemonCard();

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      // It's not an attack
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }

      const checkPokemonType = new CheckPokemonTypeEffect(effect.target);
      store.reduceEffect(state, checkPokemonType);

      if (checkPokemonType.cardTypes.includes(CardType.METAL)) {
        // Allow damage
        effect.attackEffect.ignoreWeakness = true;
        effect.reduceDamage(30);

        const target = effect.target.getPokemonCard();
        if (target) {
          target.weakness = [];
        }
        return state;
      }
    }
    return state;
  }
}
