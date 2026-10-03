import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { GameError, GameMessage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SpecialEnergyEffect } from '../../../game/store/effects/game-effects';
import { TrainerTargetEffect } from '../../../game/store/effects/play-card-effects';
import { WAS_TRAINER_TARGET_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class TempleofSinnoh extends TrainerCard {
  public regulationMark = 'F';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '155';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'ASR';
  public name = 'Temple of Sinnoh';
  public fullName = 'Temple of Sinnoh ASR';
  public text =
    "All Special Energy attached to Pokémon (both yours and your opponent's) provide [C] Energy and have no other effect.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (StateUtils.getStadiumCard(state) === this) {
      const stadiumCardList = StateUtils.findCardList(state, this);
      const stadiumOwner = StateUtils.findOwner(state, stadiumCardList);

      // Negate special energy effect when it is attached to a Pokemon
      if (effect instanceof SpecialEnergyEffect) {
        const owner = StateUtils.findOwner(state, effect.attachedTo);
        const targetCard = new TrainerTargetEffect(stadiumOwner, this, effect.attachedTo);

        if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.attachedTo, this)) {
          return state;
        }

        store.reduceEffect(state, targetCard);
        if (!WAS_TRAINER_TARGET_BLOCKED(targetCard)) {
          throw new GameError(GameMessage.CANNOT_USE_POWER);
        }
      }

      // Special energies provide [C]
      if (effect instanceof CheckProvidedEnergyEffect) {
        const owner = StateUtils.findOwner(state, effect.source);
        const targetCard = new TrainerTargetEffect(stadiumOwner, this, effect.source);

        if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.source, this)) {
          return state;
        }

        store.reduceEffect(state, targetCard);
        if (!WAS_TRAINER_TARGET_BLOCKED(targetCard)) {
          effect.specialEnergiesProvideColorless = true;
        }
      }
    }

    return state;
  }
}
