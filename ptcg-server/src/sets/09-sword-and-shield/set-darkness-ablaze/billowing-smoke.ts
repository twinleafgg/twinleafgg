import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { StateUtils } from '../../../game/store/state-utils';

export class BillowingSmoke extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public regulationMark = 'D';

  public set: string = 'DAA';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '158';

  public name: string = 'Billowing Smoke';

  public fullName: string = 'Billowing Smoke DAA';

  public text: string =
    "If the Pokémon this card is attached to is Knocked Out by damage from an attack from your opponent's Pokémon, " +
    'that player discards any Prize cards they would take for that Knock Out instead of putting those cards into their hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof KnockOutEffect &&
      effect.target.tools.includes(this) &&
      effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, effect.player);

      try {
        const toolEffect = new ToolEffect(player, this);
        store.reduceEffect(state, toolEffect);
      } catch {
        return state;
      }

      // Set the knockout effect's prize destination to the opponent's discard pile.
      effect.prizeDestination = opponent.discard;

      return state;
    }
    return state;
  }
}
