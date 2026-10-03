import { CardTag, PowerType, State, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { assembleDualStadiumFromHand } from '../../../game/store/dual-stadium-utils';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerPowerEffect } from '../../../game/store/effects/game-effects';

export class LegendaryOceanTrenchRight extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  protected _tags = [CardTag.DUAL_STADIUM];
  public regulationMark: string = 'J';
  public set: string = 'M6';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '72';
  public name: string = 'Legendary Ocean Trench';
  public fullName: string = 'Legendary Ocean Trench (Right) M6';
  public text: string = `You can only put this card into play from your hand with the other half of Legendary Ocean Trench, and it counts as one Stadium card while in play.
  
When a Pokémon in play is healed (both yours or your opponent's), double the amount of damage healed.`;
  public powers = [
    {
      name: 'Stadium Assembly',
      text: 'Put this card from your hand into play only with the other half of Legendary Ocean Trench.',
      exemptFromAbilityLock: true,
      useFromHand: true,
      powerType: PowerType.TRAINER_ABILITY,
    },
  ];

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerPowerEffect && effect.power === this.powers[0]) {
      return assembleDualStadiumFromHand(store, state, effect.player, this);
    }

    return state;
  }
}
