import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckPokemonPowersEffect } from '../../../game/store/effects/check-effects';
import { PowerType, StateUtils } from '../../../game';

export class SacredCharm extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public regulationMark = 'I';
  public set: string = 'PFL';
  public name: string = 'Sacred Charm';
  public fullName: string = 'Sacred Charm M2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '93';
  public text: string =
    "The Pokémon this card is attached to takes 30 less damage from attacks from your opponent's Pokémon that have any Abilities.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof DealDamageEffect && effect.target.tools.includes(this)) {
      const sourcePokemon = effect.source;

      // Check if the source Pokemon has any abilities
      if (sourcePokemon instanceof PokemonCard) {
        const player = StateUtils.findOwner(state, sourcePokemon);
        const powersEffect = new CheckPokemonPowersEffect(player, sourcePokemon);
        state = store.reduceEffect(state, powersEffect);
        if (powersEffect.powers.some((power) => power.powerType === PowerType.ABILITY)) {
          effect.damage -= 30;
          if (effect.damage < 0) {
            effect.damage = 0;
          }
        }
      }
    }

    return state;
  }
}
