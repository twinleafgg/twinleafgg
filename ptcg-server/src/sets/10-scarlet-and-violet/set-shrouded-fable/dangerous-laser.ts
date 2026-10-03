import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, SpecialCondition, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { Player } from '../../../game/store/state/player';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { TRAINER_TARGET_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class DangerousLaser extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.ACE_SPEC];
  public set: string = 'SFA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '58';
  public regulationMark = 'H';
  public name: string = 'Dangerous Laser';
  public fullName: string = 'Dangerous Laser SFA';
  public text: string = "Your opponent's Active Pokémon is now Burned and Confused.";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const active = opponent.active;

      if (!TRAINER_TARGET_BLOCKED(store, state, player, this, active)) {
        active.addSpecialCondition(SpecialCondition.BURNED);
        active.addSpecialCondition(SpecialCondition.CONFUSED);
      }
    }
    return state;
  }
}
