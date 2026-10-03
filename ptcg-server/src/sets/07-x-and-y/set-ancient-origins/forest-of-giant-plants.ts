import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import {
  GameError,
  GameMessage,
  PlayerType,
  StoreLike,
  State,
  StateUtils,
  pokemonHasCardType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class ForestOfGiantPlants extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'AOR';
  public setNumber: string = '74';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Forest of Giant Plants';
  public fullName: string = 'Forest of Giant Plants AOR';
  public text: string =
    "Each player's Grass Pokémon can evolve during his or her first turn or the turn he or she plays those Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      if (!pokemonHasCardType(effect.pokemonCard, CardType.GRASS)) {
        return state;
      }

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, effect.target)) {
        return state;
      }

      player.canEvolve = true;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, cardList)) {
          return;
        }

        const checkPokemonType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkPokemonType);

        if (checkPokemonType.cardTypes.includes(CardType.GRASS)) {
          cardList.pokemonPlayedTurn = state.turn - 1;
        }
      });
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
