import { StateUtils } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class CursedShovel extends TrainerCard {
  public regulationMark = 'D';
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'RCL';
  public name: string = 'Cursed Shovel';
  public fullName: string = 'Cursed Shovel RCL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '157';

  public text: string =
    "If the Pokémon this card is attached to is Knocked Out by damage from an opponent's attack, discard the top 2 cards of your opponent's deck.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof KnockOutEffect &&
      effect.target.tools.includes(this) &&
      effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      try {
        const toolEffect = new ToolEffect(player, this);
        store.reduceEffect(state, toolEffect);
      } catch {
        return state;
      }

      MOVE_CARDS(store, state, opponent.deck, opponent.discard, {
        count: 2,
        sourceCard: this,
        sourceEffect: this.attacks[0],
      });
    }
    return state;
  }
}
