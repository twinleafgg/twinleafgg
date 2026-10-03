import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { Card } from '../../../game/store/card/card';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class RescueScarf extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'DRX';

  public name: string = 'Rescue Scarf';

  public fullName: string = 'Rescue Scarf DRX';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '115';

  public text: string =
    'If the Pokemon this card is attached to is Knocked Out by damage from ' +
    'an attack, put that Pokemon into your hand. (Discard all cards ' +
    'attached to that Pokemon.)';

  public readonly RESCUE_SCARF_MAREKER = 'RESCUE_SCARF_MAREKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof KnockOutEffect && effect.target.tools.includes(this)) {
      const player = effect.player;
      const target = effect.target;
      const cards = target.getPokemons();
      cards.forEach((card) => {
        player.marker.addMarker(this.RESCUE_SCARF_MAREKER, card);
      });
    }

    if (effect instanceof BetweenTurnsEffect) {
      state.players.forEach((player) => {
        if (!player.marker.hasMarker(this.RESCUE_SCARF_MAREKER)) {
          return;
        }
        const rescued: Card[] = player.marker.markers
          .filter((m) => m.name === this.RESCUE_SCARF_MAREKER && m.source !== undefined)
          .map((m) => m.source!);
        MOVE_CARDS(store, state, player.discard, player.hand, { cards: rescued, sourceCard: this });
        player.marker.removeMarker(this.RESCUE_SCARF_MAREKER);
      });
    }
    return state;
  }
}
