import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { HANDLE_ABILITY_LOCK } from '../../../game/store/prefabs/ability-lock';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class PowerPlant extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'UNB';
  public name: string = 'Power Plant';
  public fullName: string = 'Power Plant UNB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '183';
  public text: string =
    "Pokémon-GX and Pokémon-EX in play (both yours and your opponent's) have no Abilities.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    HANDLE_ABILITY_LOCK(
      effect,
      ({ card }) => {
        if (StateUtils.getStadiumCard(state) !== this) {
          return false;
        }
        const isEXorGX = card.hasTag(CardTag.POKEMON_GX) || card.hasTag(CardTag.POKEMON_EX);
        if (!isEXorGX) {
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
        error: GameMessage.BLOCKED_BY_EFFECT,
      },
    );

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
