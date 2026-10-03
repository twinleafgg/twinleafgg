import { GameLog, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class TeamMagmaHideout extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'MA';
  public name = 'Team Magma Hideout';
  public fullName = 'Team Magma Hideout MA';
  public text =
    "Whenever any player plays a Basic Pokémon that doesn't have Team Magma in its name from his or her hand, that player puts 1 damage counter on that Pokémon.";

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
        damage: 10,
        target: effect.pokemonCard.name,
        effect: this.name,
      });

      effect.target.damage += 10;
      return state;
    }

    return state;
  }
}
