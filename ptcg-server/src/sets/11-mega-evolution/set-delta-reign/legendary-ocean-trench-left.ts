import { CardTag, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { assembleDualStadiumFromHand } from '../../../game/store/dual-stadium-utils';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect, TrainerPowerEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class LegendaryOceanTrenchLeft extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  protected _tags = [CardTag.DUAL_STADIUM];
  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '98';
  public name: string = 'Legendary Trench';
  public fullName: string = 'Legendary Ocean Trench (Left) M6';
  public text: string = `Whenever a Pokémon (yours or your opponent's) is healed, double the amount of damage healed.`;

  public powers = [{
    name: 'Legendary Trench',
    text: 'You cannot play this card by itself. You must combine 2 different Legendary Trench from your hand to play it as 1 Stadium card.',
    exemptFromAbilityLock: true,
    useFromHand: true,
    powerType: PowerType.TRAINER_ABILITY,
  }];

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerPowerEffect && effect.power === this.powers[0]) {
      return assembleDualStadiumFromHand(store, state, effect.player, this);
    }

    if (effect instanceof HealEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target, this)) {
        return state;
      }
      effect.damage *= 2;
    }

    return state;
  }
}
