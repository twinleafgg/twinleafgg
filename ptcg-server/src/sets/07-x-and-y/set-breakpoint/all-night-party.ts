import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SpecialCondition, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, GameError } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect, HealEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class AllNightParty extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'BKP';
  public setNumber: string = '96';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'All-Night Party';
  public fullName: string = 'All-Night Party BKP';
  public text: string =
    "Once during each player's turn, if that player's Active Pokémon is Asleep, he or she may remove that Special Condition and heal 30 damage from that Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      if (!player.active.specialConditions.includes(SpecialCondition.ASLEEP)) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active)) {
        return state;
      }

      player.active.removeSpecialCondition(SpecialCondition.ASLEEP);
      const healEffect = new HealEffect(player, player.active, 30);
      store.reduceEffect(state, healEffect);
    }

    return state;
  }
}
