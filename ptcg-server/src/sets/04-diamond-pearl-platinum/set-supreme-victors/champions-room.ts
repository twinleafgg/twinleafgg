import { GameError, GameMessage, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class ChampionsRoom extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '135';
  public name: string = 'Champion\'s Room';
  public fullName: string = 'Champion\'s Room SV';
  public text: string = 'This card stays in play when you play it. Discard this card if another Stadium card comes into play. If another card with the same name is in play, you can\'t play this card. The Retreat cost for each Pokémon SP (both yours and your opponent\'s) is Colorless less.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    if (effect instanceof CheckRetreatCostEffect && StateUtils.getStadiumCard(state) === this) {
      const pokemon = effect.player.active.getPokemonCard();
      if (!pokemon || !pokemon.hasTag(CardTag.POKEMON_SP)) {
        return state;
      }
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active, this)) {
        return state;
      }
      const index = effect.cost.indexOf(CardType.COLORLESS);
      if (index !== -1) {
        effect.cost.splice(index, 1);
      }
    }

    return state;
  }
}
