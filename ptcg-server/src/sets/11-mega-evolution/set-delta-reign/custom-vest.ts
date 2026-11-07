import { CardTag, State, StateUtils, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { GamePhase } from '../../../game/store/state/state';

export class CustomVest extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '91';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Custom Vest';
  public fullName: string = 'Custom Vest M6';
  public text: string = "If the Pokémon this card is attached to isn't a Mega Evolution Pokémon ex, it takes 60 less damage from attacks from your opponent's Mega Evolution Pokémon ex (after applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PutDamageEffect && effect.target.tools.includes(this)) {
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }

      const owner = StateUtils.findOwner(state, effect.target);
      if (IS_TOOL_BLOCKED(store, state, owner, this)) {
        return state;
      }

      const attacker = StateUtils.findOwner(state, effect.source);
      if (owner === attacker) {
        return state;
      }

      const targetCard = effect.target.getPokemonCard();
      if (targetCard?.hasTag(CardTag.POKEMON_SV_MEGA) && targetCard.hasTag(CardTag.POKEMON_ex)) {
        return state;
      }

      const sourceCard = effect.source.getPokemonCard();
      if (!(sourceCard?.hasTag(CardTag.POKEMON_SV_MEGA) && sourceCard.hasTag(CardTag.POKEMON_ex))) {
        return state;
      }

      effect.reduceDamage(60);
    }

    return state;
  }
}
