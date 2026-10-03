import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { GameError, GameMessage, StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  PlaceDamageCountersEffect,
  RetreatEffect,
  UseStadiumEffect,
} from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class Spikemuth extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public regulationMark: string = 'D';
  public set: string = 'DAA';
  public setNumber: string = '170';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Spikemuth';
  public fullName: string = 'Spikemuth DAA';
  public text: string =
    "Whenever a player's Active Pokémon moves to the Bench during their turn, put 2 damage counters on that Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    if (effect instanceof RetreatEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const retreatingPokemon = player.active;

      if (retreatingPokemon.cards.length === 0) {
        return state;
      }

      const placeCounters = new PlaceDamageCountersEffect(player, retreatingPokemon, 20);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, retreatingPokemon, this)) {
        return state;
      }

      store.reduceEffect(state, placeCounters);
    }

    return state;
  }
}
