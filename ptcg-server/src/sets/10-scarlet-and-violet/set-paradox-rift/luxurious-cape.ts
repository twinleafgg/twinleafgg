import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, GamePhase } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class LuxuriousCape extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public regulationMark = 'G';
  public set: string = 'PAR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '166';
  public name: string = 'Luxurious Cape';
  public fullName: string = 'Luxurious Cape PAR';

  public text: string =
    "If the Pokémon this card is attached to doesn't have a Rule Box, it gets +100 HP, and if it is Knocked Out by damage from an attack from your opponent's Pokémon, that player takes 1 more Prize card. (Pokémon ex, Pokémon V, etc. have Rule Boxes.)";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckHpEffect && effect.target.tools.includes(this)) {
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (!effect.target.hasRuleBox()) {
        effect.hp += 100;
      }
    }

    if (
      effect instanceof KnockOutEffect &&
      effect.target.tools.includes(this) &&
      effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)
    ) {
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }

      if (!effect.target.hasRuleBox()) {
        effect.prizeCount += 1;
      }

      return state;
    }
    return state;
  }
}
