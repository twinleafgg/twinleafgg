import { StateUtils, pokemonHasCardTypeOptional } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class Electropower extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'LOT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '172';

  public name: string = 'Electropower';

  public fullName: string = 'Electropower LOT';

  public text: string =
    "During this turn, your [L] Pokémon's attacks do 30 more damage to your opponent's Active Pokémon (before applying Weakness and Resistance).";

  private readonly ELECTROPOWER_MARKER = 'ELECTROPOWER_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      player.marker.addMarker(this.ELECTROPOWER_MARKER, this);
    }

    if (
      effect instanceof DealDamageEffect &&
      pokemonHasCardTypeOptional(effect.player.active.getPokemonCard(), CardType.LIGHTNING)
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (
        player.marker.hasMarker(this.ELECTROPOWER_MARKER, this) &&
        effect.damage > 0 &&
        effect.target === opponent.active
      ) {
        effect.damage += 30;
      }
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.marker.removeMarker(this.ELECTROPOWER_MARKER, this);
    }

    return state;
  }
}
