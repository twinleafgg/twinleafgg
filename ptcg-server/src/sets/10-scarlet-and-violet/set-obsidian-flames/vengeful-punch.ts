import { GamePhase, State, StateUtils, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class VengefulPunch extends TrainerCard {
  public regulationMark = 'G';
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'OBF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '197';
  public name = 'Vengeful Punch';
  public fullName = 'Vengeful Punch OBF';
  public text: string =
    'If the Pokémon this card is attached to is Knocked Out by damage from an attack from your opponent\'s Pokémon, put 4 damage counters on the Attacking Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof KnockOutEffect &&
      effect.target.tools.includes(this) &&
      effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)
    ) {
      const player = effect.player;
      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        return state;
      }
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }
      const opponent = StateUtils.getOpponent(state, player);
      opponent.active.damage += 40;
    }

    return state;
  }
}
