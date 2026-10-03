import { StateUtils } from '../../../game/store/state-utils';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {
  GET_PLAYER_BENCH_SLOTS,
  SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH,
} from '../../../game/store/prefabs/prefabs';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

export class PokemonResearchLab extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '205';

  protected _trainerType = TrainerType.STADIUM;

  public set = 'UNM';

  public name = 'Pokémon Research Lab';

  public fullName = 'Pokémon Research Lab UNM';

  public text =
    "Once during each player's turn, that player may search their deck for up to 2 Pokémon that evolve from Unidentified Fossil, put those Pokémon onto their Bench, and shuffle their deck. If a player searches their deck in this way, their turn ends.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const slots = GET_PLAYER_BENCH_SLOTS(player);

      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH(
        store,
        state,
        player,
        { evolvesFrom: 'Unidentified Fossil' },
        { min: 0, max: Math.min(2, slots.length), allowCancel: true },
      );

      return store.reduceEffect(state, new EndTurnEffect(player));
    }

    return state;
  }
}
