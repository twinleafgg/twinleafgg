import { State, StateUtils, StoreLike, pokemonHasCardType } from '../../../game';
import { CardType, Stage, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import {
  PlayPokemonEffect,
  PlayPokemonFromDeckEffect,
  PlayPokemonFromDiscardEffect,
} from '../../../game/store/effects/play-card-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class DangerousRuins extends TrainerCard {
  public regulationMark = 'I';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '127';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'MEG';
  public name = 'Risky Ruins';
  public fullName = 'Risky Ruins MEG';
  public text =
    'Whenever any player puts a Basic non-[D] Pokémon onto their Bench, put 2 damage counters on that Pokémon.';

  reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      (effect instanceof PlayPokemonEffect ||
        effect instanceof PlayPokemonFromDeckEffect ||
        effect instanceof PlayPokemonFromDiscardEffect) &&
      StateUtils.getStadiumCard(state) === this
    ) {
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.target, this)) {
        return state;
      }

      if (effect.target.cards.length > 0 || pokemonHasCardType(effect.pokemonCard, CardType.DARK)) {
        return state;
      }

      if (effect.pokemonCard.stage === Stage.BASIC) {
        effect.target.damage += 20;
      }
      return state;
    }

    return state;
  }
}
