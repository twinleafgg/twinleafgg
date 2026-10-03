import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, Stage } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { HANDLE_ABILITY_LOCK } from '../../../game/store/prefabs/ability-lock';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';

export class SilentLab extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'PRC';
  public name: string = 'Silent Lab';
  public fullName: string = 'Silent Lab PRC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '140';
  public text: string =
    "Each Basic Pokemon in play, in each player's hand, and in each player's discard pile has no Abilities.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    HANDLE_ABILITY_LOCK(effect, ({ card }) => {
      if (StateUtils.getStadiumCard(state) !== this) {
        return false;
      }
      try {
        const cardList = StateUtils.findCardList(state, card);
        if (cardList instanceof PokemonCardList) {
          const owner = StateUtils.findOwner(state, cardList);
          if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, cardList)) {
            return false;
          }
          return cardList.isStage(Stage.BASIC);
        }
      } catch {
        // Card may be mid-probe; fall through to printed stage.
      }
      return card.stage === Stage.BASIC;
    });

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
