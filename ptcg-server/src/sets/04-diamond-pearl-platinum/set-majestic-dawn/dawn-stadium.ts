import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class DawnStadium extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'MD';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '79';
  public name: string = 'Dawn Stadium';
  public fullName: string = 'Dawn Stadium MD';
  public text: string = 'This card stays in play when you play it. Discard this card if another Stadium card comes into play. If another card with the same name is in play, you can\'t play this card. Whenever any player attaches an Energy card from his or her hand to Grass Pokémon or Water Pokémon, remove 1 damage counter and all Special Conditions from that Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AttachEnergyEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, effect.target, this)) {
        return state;
      }
      const checkType = new CheckPokemonTypeEffect(effect.target);
      store.reduceEffect(state, checkType);
      if (!checkType.cardTypes.includes(G) && !checkType.cardTypes.includes(W)) {
        return state;
      }
      store.reduceEffect(state, new HealEffect(player, effect.target, 10));
      const conditions = effect.target.specialConditions.slice();
      conditions.forEach(condition => effect.target.removeSpecialCondition(condition));
    }

    return state;
  }
}
