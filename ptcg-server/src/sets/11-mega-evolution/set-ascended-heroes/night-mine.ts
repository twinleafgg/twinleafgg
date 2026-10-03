import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType, CardTag } from '../../../game/store/card/card-types';
import { CheckAttackCostEffect } from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { StateUtils } from '../../../game/store/state-utils';

export class NightMine extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public regulationMark = 'I';
  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '197';
  public name: string = 'Nighttime Mine';
  public fullName: string = 'Night Mine M2a';
  public text: string =
    "Attacks used by each Tera Pokémon in play (both yours and your opponent's) cost [C] more.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckAttackCostEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const pokemonCard = player.active.getPokemonCard();

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, player.active, this)) {
        return state;
      }

      if (pokemonCard && pokemonCard.hasTag(CardTag.POKEMON_TERA)) {
        const index = effect.cost.indexOf(CardType.COLORLESS);
        if (index > -1) {
          effect.cost.splice(index, 0, CardType.COLORLESS);
        } else {
          effect.cost.push(CardType.COLORLESS);
        }
        return state;
      }
      return state;
    }

    return state;
  }
}
