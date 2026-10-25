import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, Stage, TrainerType } from '../../../game/store/card/card-types';
import { GameError, GameLog, GameMessage, State, StateUtils, StoreLike, pokemonHasCardType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class MiasmaValley extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '111';
  public name: string = 'Miasma Valley';
  public fullName: string = 'Miasma Valley PL';
  public text: string = 'This card stays in play when you play it. Discard this card if another Stadium card comes into play. If another card with the same name is in play, you can\'t play this card. Whenever any player puts a Basic Pokémon (excluding Grass or Psychic Pokémon) from his or her hand onto his or her Bench, put 2 damage counters on that Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    if (effect instanceof PlayPokemonEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (!owner.bench.includes(effect.target)) {
        return state;
      }
      if (effect.pokemonCard.stage !== Stage.BASIC) {
        return state;
      }
      if (pokemonHasCardType(effect.pokemonCard, CardType.GRASS) || pokemonHasCardType(effect.pokemonCard, CardType.PSYCHIC)) {
        return state;
      }
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target, this)) {
        return state;
      }

      store.log(state, GameLog.LOG_PLAYER_PLACES_DAMAGE_COUNTERS, {
        name: owner.name,
        damage: 20,
        target: effect.pokemonCard.name,
        effect: this.name
      });
      effect.target.damage += 20;
    }

    return state;
  }
}
