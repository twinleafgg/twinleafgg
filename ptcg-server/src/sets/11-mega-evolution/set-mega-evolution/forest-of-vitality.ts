import { PlayerType, State, StateUtils, StoreLike, pokemonHasCardType } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class LushForest extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '117';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'MEG';
  public name = 'Forest of Vitality';
  public fullName = 'Forest of Vitality MEG';
  public regulationMark = 'I';
  public text =
    "Each player's [G] Pokémon can evolve into [G] Pokémon during the turn they play those Pokémon, except during their first turn.";

  reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      if (state.turn <= 2 || !pokemonHasCardType(effect.pokemonCard, CardType.GRASS)) {
        return state;
      }

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, effect.target, this)) {
        return state;
      }

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, cardList, this)) {
          return;
        }

        const checkPokemonType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkPokemonType);

        if (checkPokemonType.cardTypes.includes(CardType.GRASS)) {
          cardList.pokemonPlayedTurn = state.turn - 1;
        }
      });
    }

    return state;
  }
}
