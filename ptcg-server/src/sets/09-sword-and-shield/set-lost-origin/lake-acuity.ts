import { StoreLike, State, EnergyCard, StateUtils } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class LakeAcuity extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public regulationMark = 'F';
  public set: string = 'LOR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '160';
  public name: string = 'Lake Acuity';
  public fullName: string = 'Lake Acuity LOR';
  public text: string =
    "All Pokémon that have any [W] or [F] Energy attached (both yours and your opponent's) take 20 less damage from attacks from the opponent's Pokémon (after applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PutDamageEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      const hasWaterOrFightingEnergy = effect.target.cards.some(
        (card) =>
          card instanceof EnergyCard &&
          (card.provides.includes(CardType.WATER) || card.provides.includes(CardType.FIGHTING)),
      );

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target, this)) {
        return state;
      }

      if (hasWaterOrFightingEnergy) {
        effect.damage -= 20;
      }
    }

    return state;
  }
}
