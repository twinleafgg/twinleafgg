import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CheckPokemonStatsEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class LakeBoundary extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'MT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '112';
  public name: string = 'Lake Boundary';
  public fullName: string = 'Lake Boundary MT';
  public text: string = 'This card stays in play when you play it. Discard this card if another Stadium card comes into play. If another card with the same name is in play, you can\'t play this card. Apply Weakness for each Pokémon (both yours and your opponent\'s) as ×2 instead.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    if (effect instanceof CheckPokemonStatsEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target, this)) {
        return state;
      }
      effect.weakness = effect.weakness.map(w => ({ type: w.type }));
    }

    return state;
  }
}
