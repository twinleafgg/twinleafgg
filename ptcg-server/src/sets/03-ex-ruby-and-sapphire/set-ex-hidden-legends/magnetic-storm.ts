import { State, StateUtils, StoreLike } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class MagneticStorm extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '91';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'HL';
  public name = 'Magnetic Storm';
  public fullName = 'Magnetic Storm HL';
  public text =
    "Any damage done by attacks from [P] Pokémon and [F] Pokémon (both yours and your opponent's) is not affected by Resistance.";

  reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AttackEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.source);
      const checkPokemonType = new CheckPokemonTypeEffect(effect.source);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.source)) {
        return state;
      }

      store.reduceEffect(state, checkPokemonType);

      if (
        [CardType.PSYCHIC, CardType.FIGHTING].some((t) => checkPokemonType.cardTypes.includes(t))
      ) {
        effect.ignoreResistance = true;
      }
    }

    return state;
  }
}
