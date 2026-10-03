import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';
import { PlayerType } from '../../../game/store/actions/play-card-action';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class JammingTower extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public regulationMark = 'H';
  public set: string = 'TWM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '153';
  public name: string = 'Jamming Tower';
  public fullName: string = 'Jamming Tower TWM';
  public text: string =
    "Pokémon Tools attached to each Pokémon (both yours and your opponent's) have no effect.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    if (effect instanceof ToolEffect && StateUtils.getStadiumCard(state) === this) {
      let toolTarget: PokemonCardList | undefined;
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (cardList.tools.includes(effect.card)) {
          toolTarget = cardList;
        }
      });
      if (toolTarget && IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, toolTarget)) {
        return state;
      }
      throw new GameError(GameMessage.CANNOT_USE_POWER);
    }

    return state;
  }
}
