import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

export class Iris extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'PLB';
  public setNumber: string = '81';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Iris';
  public fullName: string = 'Iris PLB';
  public text: string =
    "During this turn, your Pokémon's attacks do 10 more damage to the Active Pokémon for each Prize card your opponent has taken (before applying Weakness and Resistance). You may play only 1 Supporter card during your turn (before your attack).";

  public readonly IRIS_MARKER = 'IRIS_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      player.marker.addMarker(this.IRIS_MARKER, this);
    }

    // Intercept DealDamageEffect to add bonus damage
    if (effect instanceof DealDamageEffect) {
      const player = effect.player;

      if (!player.marker.hasMarker(this.IRIS_MARKER, this)) {
        return state;
      }

      const opponent = StateUtils.getOpponent(state, player);

      if (effect.target !== opponent.active) {
        return state;
      }

      const prizesTaken = opponent.prizesTaken;

      if (prizesTaken > 0) {
        effect.damage += 10 * prizesTaken;
      }
    }

    // Clean up at end of turn
    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.IRIS_MARKER, this);
    }

    return state;
  }
}
