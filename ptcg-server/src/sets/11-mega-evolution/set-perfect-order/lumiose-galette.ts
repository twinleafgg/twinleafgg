import {
  TrainerCard,
  TrainerType,
  StoreLike,
  State,
  GameError,
  GameMessage,
  Player,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';

export class LumioseGalette extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '78';
  public name: string = 'Lumiose Galette';
  public fullName: string = 'Lumiose Galette M3';
  public text: string = 'Heal 20 damage and remove a Special Condition from your Active Pokemon.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean | undefined {
    const hasDamage = player.active.damage > 0;
    const hasSpecialCondition = player.active.specialConditions.length > 0;
    if (!hasDamage && !hasSpecialCondition) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      // Check if Active Pokemon has damage or special conditions
      const hasDamage = player.active.damage > 0;
      const hasSpecialCondition = player.active.specialConditions.length > 0;

      // Cannot be played if there's no damage AND no special conditions
      if (!hasDamage && !hasSpecialCondition) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      effect.preventDefault = true;

      // Heal 20 damage
      const healEffect = new HealEffect(player, player.active, 20);
      store.reduceEffect(state, healEffect);

      // Remove 1 Special Condition
      if (player.active.specialConditions.length > 0) {
        player.active.removeSpecialCondition(player.active.specialConditions[0]);
      }
    }

    return state;
  }
}
