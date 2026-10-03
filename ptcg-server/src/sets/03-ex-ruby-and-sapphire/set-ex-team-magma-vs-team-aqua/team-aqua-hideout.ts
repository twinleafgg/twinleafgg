import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType, CardTag } from '../../../game/store/card/card-types';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class TeamAquaHideout extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'MA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '78';
  public name: string = 'Team Aqua Hideout';
  public fullName: string = 'Team Aqua Hideout MA';
  public text: string =
    'Each Pokémon that does not have Team Aqua in its name pays [C] more to retreat.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckRetreatCostEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const pokemonCard = player.active.getPokemonCard();

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active)) {
        return state;
      }

      if (pokemonCard && !pokemonCard.hasTag(CardTag.TEAM_AQUA)) {
        effect.cost.push(CardType.COLORLESS);
      }
    }

    return state;
  }
}
