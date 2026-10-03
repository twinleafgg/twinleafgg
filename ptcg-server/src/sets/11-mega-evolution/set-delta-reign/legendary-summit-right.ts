import { CardTag, PowerType, State, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { assembleDualStadiumFromHand } from '../../../game/store/dual-stadium-utils';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerPowerEffect } from '../../../game/store/effects/game-effects';

export class LegendarySummitRight extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  protected _tags = [CardTag.DUAL_STADIUM];
  public set: string = 'M6';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '74';
  public name: string = 'Legendary Summit';
  public fullName: string = 'Legendary Summit (Right) M6';
  public text: string =
    'You can only put this card into play from your hand with the other half of Legendary Summit, and it counts as one Stadium card while in play.\n\n' +
    "When Knocked Out by damage from an opponent's attack, both player's [C] Pokémon give up one less Prize card.";
  public powers = [
    {
      name: 'Stadium Assembly',
      text: 'Put this card from your hand into play only with the other half of Legendary Summit.',
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
