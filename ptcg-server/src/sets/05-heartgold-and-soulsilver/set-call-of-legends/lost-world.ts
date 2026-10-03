import { GameMessage } from '../../../game/game-message';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { GameError, PokemonCard } from '../../../game';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { endGame } from '../../../game/store/effect-reducers/check-effect';

export class LostWorld extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '81';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'CL';
  public name = 'Lost World';
  public fullName = 'Lost World CL';

  public text =
    "Once during each player's turn, if that player's opponent has 6 or more Pokémon in the Lost Zone, the player may choose to win the game.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const winner = state.activePlayer;

      if (opponent.lostzone.cards.filter((c) => c instanceof PokemonCard).length < 6) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      state = endGame(store, state, winner);
    }
    return state;
  }
}
