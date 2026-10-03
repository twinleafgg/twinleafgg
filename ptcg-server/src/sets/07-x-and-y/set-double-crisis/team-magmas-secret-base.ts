import { GameLog, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class TeamMagmasSecretBase extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '32';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'DCR';
  public name = "Team Magma's Secret Base";
  public fullName = "Team Magma's Secret Base DCR";
  public text: string =
    'Whenever any player puts a Basic Pokémon (except for Team Magma Pokémon) from his or her hand onto his or her Bench, put 2 damage counters on that Pokémon.';

  reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.target)) {
        return state;
      }

      if (effect.target.cards.length > 0 || effect.pokemonCard.hasTag(CardTag.TEAM_MAGMA)) {
        return state;
      }

      store.log(state, GameLog.LOG_PLAYER_PLACES_DAMAGE_COUNTERS, {
        name: owner.name,
        damage: 20,
        target: effect.pokemonCard.name,
        effect: this.name,
      });

      effect.target.damage += 20;
    }

    return state;
  }
}
