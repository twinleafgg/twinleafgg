import { GamePhase, State, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { DRAW_CARDS_UNTIL_CARDS_IN_HAND, IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class LuckyEgg extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'AR';
  public name: string = 'Lucky Egg';
  public fullName: string = 'Lucky Egg AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '88';
  public text: string = 'When the Pokémon this card is attached to is Knocked Out by damage from an opponent\'s attack, draw cards until you have 7 cards in your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
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
      DRAW_CARDS_UNTIL_CARDS_IN_HAND(effect.player, 7);
    }

    return state;
  }
}
