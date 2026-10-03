import { StoreLike } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { PutCountersEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

import { StateUtils } from '../../../game/store/state-utils';
import { GamePhase, State } from '../../../game/store/state/state';

export class MetalGoggles extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'TEU';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '148';

  public name: string = 'Metal Goggles';

  public fullName: string = 'Metal Goggles TEU';

  public text: string =
    "The [M] Pokémon this card is attached to takes 30 less damage from your opponent's attacks (after applying Weakness and Resistance), and your opponent's attacks and Abilities can't put damage counters on it.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PutDamageEffect && effect.target.tools.includes(this)) {
      const sourceCard = effect.target.getPokemonCard();

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      // It's not an attack
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }

      const player = StateUtils.findOwner(state, effect.target);

      if (sourceCard) {
        const checkPokemonTypeEffect = new CheckPokemonTypeEffect(effect.target);
        store.reduceEffect(state, checkPokemonTypeEffect);

        if (checkPokemonTypeEffect.cardTypes.includes(CardType.METAL)) {
          // Check if damage target is owned by this card's owner
          const targetPlayer = StateUtils.findOwner(state, effect.target);
          if (targetPlayer === player) {
            effect.reduceDamage(30);
          }

          return state;
        }
      }
    }

    if (effect instanceof PutCountersEffect && effect.target.tools.includes(this)) {
      const sourceCard = effect.target.getPokemonCard();

      const player = StateUtils.findOwner(state, effect.target);

      if (sourceCard) {
        const checkPokemonTypeEffect = new CheckPokemonTypeEffect(effect.target);
        store.reduceEffect(state, checkPokemonTypeEffect);

        if (checkPokemonTypeEffect.cardTypes.includes(CardType.METAL)) {
          // Check if damage target is owned by this card's owner
          const targetPlayer = StateUtils.findOwner(state, effect.target);
          if (targetPlayer === player) {
            effect.preventDefault = true;
          }

          return state;
        }
      }
    }
    return state;
  }
}
