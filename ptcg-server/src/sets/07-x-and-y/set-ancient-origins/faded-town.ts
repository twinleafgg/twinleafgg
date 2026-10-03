import { Effect } from '../../../game/store/effects/effect';
import { PlayerType, GameError, GameMessage } from '../../../game';
import { Stage } from '../../../game/store/card/card-types';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';

export class FadedTown extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'AOR';
  public setNumber = '73';
  public cardImage = 'assets/cardback.png';
  public name: string = 'Faded Town';
  public fullName: string = 'Faded Town AOR';
  public text: string =
    'At any time between turns, put 2 damage counters on each Mega Evolution Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof BetweenTurnsEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const pokemon = cardList.getPokemonCard();
        if (pokemon && pokemon.stage === Stage.MEGA) {
          const owner = StateUtils.findOwner(state, cardList);
          if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, cardList)) {
            return;
          }
          cardList.damage += 2;
        }
      });
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
