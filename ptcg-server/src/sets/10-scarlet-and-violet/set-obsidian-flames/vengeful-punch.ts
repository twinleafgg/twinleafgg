import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { StateUtils } from '../../../game';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
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
    "If the Pokémon this card is attached to is Knocked Out by damage from an attack from your opponent's Pokémon, put 4 damage counters on the Attacking Pokémon.";

  public damageDealt = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    /*if (effect instanceof AfterDamageEffect && effect.target.tools.includes(this)) {
      const player = effect.player;
      const targetPlayer = StateUtils.findOwner(state, effect.target);
  


      if (effect.damage <= 0 || player === targetPlayer || targetPlayer.active !== effect.target) {
        return state;
      }
  
      const activePokemon = player.active as unknown as PokemonCard;
      const maxHp = activePokemon.hp;
  
      if (state.phase === GamePhase.ATTACK) {
        if (player.active.damage >= maxHp) {
          effect.source.damage += 40;
        }
      }
    }*/

    if (
      (effect instanceof DealDamageEffect || effect instanceof PutDamageEffect) &&
      effect.target.tools.includes(this)
    ) {
      const player = StateUtils.getOpponent(state, effect.player);

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (player.active.tools.includes(this)) {
        this.damageDealt = true;
      }
    }

    if (
      effect instanceof KnockOutEffect &&
      effect.target.tools.includes(this) &&
      effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (this.damageDealt) {
        opponent.active.damage += 40;
      }
    }

    return state;
  }
}
