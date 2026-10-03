import {
  SpecialCondition,
  State,
  StateUtils,
  StoreLike,
  TrainerCard,
  TrainerType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { TRAINER_TARGET_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class YellHorn extends TrainerCard {
  public name: string = 'Yell Horn';
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public fullName: string = 'Yell Horn DAA';
  public set: string = 'DAA';
  public setNumber: string = '173';
  public regulationMark = 'D';
  public cardImage: string = 'assets/cardback.png';
  public text: string = 'Both Active Pokémon are now Confused.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      player.active.addSpecialCondition(SpecialCondition.CONFUSED);
      if (!TRAINER_TARGET_BLOCKED(store, state, player, this, opponent.active)) {
        opponent.active.addSpecialCondition(SpecialCondition.CONFUSED);
      }
      return state;
    }
    return state;
  }
}
