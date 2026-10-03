import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, Stage, CardType } from '../../../game/store/card/card-types';
import { CheckAttackCostEffect } from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { StateUtils } from '../../../game/store/state-utils';

export class PokemonLeagueHeadquarters extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public regulationMark = 'G';
  public set: string = 'OBF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '192';
  public name: string = 'Pokémon League Headquarters';
  public fullName: string = 'Pokémon League Headquarters OBF';
  public text: string =
    "Attacks used by each Basic Pokémon in play (both yours and your opponent's) cost [C] more.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckAttackCostEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const pokemonCard = player.active.getPokemonCard();

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active, this)) {
        return state;
      }

      if (pokemonCard && pokemonCard.stage == Stage.BASIC) {
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
