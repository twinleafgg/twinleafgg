import { State, StateUtils, StoreLike } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class IslandCave extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '89';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'HL';
  public name = 'Island Cave';
  public fullName = 'Island Cave HL';
  public text =
    'Whenever any player attaches an Energy card from his or hand to [W] Pokémon, [F] Pokémon, or [M] Pokémon, remove any Special Conditions from that Pokémon.';

  reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AttachEnergyEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      const checkPokemonType = new CheckPokemonTypeEffect(effect.target);
      const islandTypes = [CardType.WATER, CardType.FIGHTING, CardType.METAL];

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target)) {
        return state;
      }

      store.reduceEffect(state, checkPokemonType);

      if (islandTypes.some((t) => checkPokemonType.cardTypes.includes(t))) {
        effect.target.clearAllSpecialConditions();
      }
    }

    return state;
  }
}
