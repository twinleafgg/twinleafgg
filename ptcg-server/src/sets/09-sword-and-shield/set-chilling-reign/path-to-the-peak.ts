import { StateUtils } from '../../../game/store/state-utils';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { GameError, GameMessage } from '../../../game';
import { HANDLE_ABILITY_LOCK } from '../../../game/store/prefabs/ability-lock';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class PathToThePeak extends TrainerCard {
  protected _trainerType = TrainerType.STADIUM;
  public set = 'CRE';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '148';
  public regulationMark = 'E';
  public name = 'Path to the Peak';
  public fullName = 'Path to the Peak CRE';
  public text =
    "Pokémon with a Rule Box in play (both yours and your opponent's) have no Abilities. (Pokémon V, Pokémon-GX, etc. have Rule Boxes.)";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    HANDLE_ABILITY_LOCK(
      effect,
      ({ card }) => {
        if (StateUtils.getStadiumCard(state) !== this) {
          return false;
        }
        if (!card.hasRuleBox()) {
          return false;
        }
        const slot = StateUtils.findPokemonSlot(state, card);
        if (slot === undefined) {
          return false;
        }
        const owner = StateUtils.findOwner(state, slot);
        if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, slot)) {
          return false;
        }
        return true;
      },
      {
        allowUseFromHand: true,
        allowUseFromDiscard: true,
      },
    );

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
