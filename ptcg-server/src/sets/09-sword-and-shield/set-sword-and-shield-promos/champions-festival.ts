import { GameError, GameMessage, PlayerType, State, StateUtils, StoreLike } from '../../../game';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect, UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class ChampionsFestival extends TrainerCard {
  protected _trainerType = TrainerType.STADIUM;
  public set = 'SWSH';
  public regulationMark = 'F';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '296';
  public name = "Champion's Festival";
  public fullName = "Champion's Festival SWSH";
  public text =
    "Once during each player's turn, if that player has 6 Pokémon in play, they may heal 10 damage from each of their Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const pokemonInPlay =
        player.bench.filter((b) => b.cards.length > 0).length +
        (player.active.cards.length > 0 ? 1 : 0);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, player.active, this)) {
        return state;
      }

      if (pokemonInPlay !== 6) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        store.reduceEffect(state, new HealEffect(player, cardList, 10));
      });
    }

    return state;
  }
}
