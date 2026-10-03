import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';

export class PowerTablet extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'FST';

  protected _tags = [CardTag.FUSION_STRIKE];

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '236';

  public regulationMark = 'E';

  public name: string = 'Power Tablet';

  public fullName: string = 'Power Tablet FST';

  public text: string =
    "During this turn, your Fusion Strike Pokémon's attacks do 30 more damage to your opponent's Active Pokémon (before applying Weakness and Resistance).";

  public readonly POWER_TABLET_MARKER = 'POWER_TABLET_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      player.marker.addMarker(this.POWER_TABLET_MARKER, this);
    }

    if (
      effect instanceof DealDamageEffect &&
      effect.player.active.getPokemonCard()?.hasTag(CardTag.FUSION_STRIKE)
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (
        player.marker.hasMarker(this.POWER_TABLET_MARKER, this) &&
        effect.damage > 0 &&
        effect.target === opponent.active
      ) {
        effect.damage += 30;
      }
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.marker.removeMarker(this.POWER_TABLET_MARKER, this);
    }

    return state;
  }
}
