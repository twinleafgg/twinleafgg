import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EvolveEffect, HealEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class WyndonStadium extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public regulationMark: string = 'D';
  public set: string = 'VIV';
  public setNumber: string = '161';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Wyndon Stadium';
  public fullName: string = 'Wyndon Stadium VIV';
  public text: string =
    'Whenever either player plays a Pokémon VMAX from their hand to evolve a Pokémon V during their turn, heal 100 damage from that Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EvolveEffect && StateUtils.getStadiumCard(state) === this) {
      const target = effect.target;
      const owner = StateUtils.findOwner(state, target);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, target, this)) {
        return state;
      }

      if (!effect.pokemonCard.hasTag(CardTag.POKEMON_VMAX)) {
        return state;
      }

      if (target.damage > 0) {
        const healAmount = Math.min(100, target.damage);
        const healEffect = new HealEffect(effect.player, target, healAmount);
        store.reduceEffect(state, healEffect);
      }
    }

    return state;
  }
}
