import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  GameError,
  GameMessage,
  pokemonHasCardType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { CheckPokemonStatsEffect } from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';

export class AltarOfTheSunne extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'GRI';
  public setNumber: string = '118';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Altar of the Sunne';
  public fullName: string = 'Altar of the Sunne GRI';
  public text: string =
    "Fire Pokémon and Metal Pokémon (both yours and your opponent's) have no Weakness.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckPokemonStatsEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      const target = effect.target;
      const pokemonCard = target.getPokemonCard();

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target, this)) {
        return state;
      }

      if (pokemonCard instanceof PokemonCard) {
        if (
          pokemonHasCardType(pokemonCard, CardType.FIRE) ||
          pokemonHasCardType(pokemonCard, CardType.METAL)
        ) {
          effect.weakness = [];
        }
      }
      return state;
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
