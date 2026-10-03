import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { StateUtils } from '../../..';

export class KarensConviction extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'CRE';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '144';

  public regulationMark = 'E';

  public name: string = "Karen's Conviction";

  public fullName: string = "Karen's Conviction CRE";

  public text: string =
    "During this turn, your Single Strike Pokémon's attacks do 20 more damage to your opponent's Active Pokémon for each Prize card your opponent has taken (before applying Weakness and Resistance).";

  private readonly KARENS_CONVICTION_MARKER = 'KARENS_CONVICTION_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const damagePerPrize = 20;
      player.marker.addMarker(this.KARENS_CONVICTION_MARKER, this);

      if (effect instanceof DealDamageEffect) {
        const marker = effect.player.marker;
        if (marker.hasMarker(this.KARENS_CONVICTION_MARKER, this) && effect.damage > 0) {
          effect.damage += opponent.prizesTaken * damagePerPrize;
        }
        return state;
      }

      if (
        effect instanceof EndTurnEffect &&
        effect.player.marker.hasMarker(this.KARENS_CONVICTION_MARKER, this)
      ) {
        effect.player.marker.removeMarker(this.KARENS_CONVICTION_MARKER, this);
        return state;
      }

      return state;
    }
    return state;
  }
}
