import { CardTag, PowerType, State, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { assembleDualStadiumFromHand } from '../../../game/store/dual-stadium-utils';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerPowerEffect } from '../../../game/store/effects/game-effects';

export class LegendarySummitRight extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  protected _tags = [CardTag.DUAL_STADIUM];
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '97';
  public name: string = 'Legendary Summit';
  public fullName: string = 'Legendary Summit (Right) M6';
  public text: string = `Whenever a [C] Pokémon (yours or your opponent's) is Knocked Out by damage from an attack from the opponent's Pokémon, that player takes 1 fewer Prize card.`;

  public powers = [{
    name: 'Legendary Summit',
    text: 'You cannot play this card by itself. You must combine 2 different Legendary Summit from your hand to play it as 1 Stadium card.',
    exemptFromAbilityLock: true,
    useFromHand: true,
    powerType: PowerType.TRAINER_ABILITY,
  }];

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerPowerEffect && effect.power === this.powers[0]) {
      return assembleDualStadiumFromHand(store, state, effect.player, this);
    }

    return state;
  }
}
