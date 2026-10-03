import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game';

export class PokemonRanger extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'STS';

  public name: string = 'Pokémon Ranger';

  public fullName: string = 'Pokemon Ranger STS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '104';

  public text: string = 'Remove all effects of attacks on each player and his ' + 'or her Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Both players and each of their Pokémon. Not damage or Special Conditions.
      player.removeAttackEffectsFromPlayerAndPokemon();
      opponent.removeAttackEffectsFromPlayerAndPokemon();
    }

    return state;
  }
}
