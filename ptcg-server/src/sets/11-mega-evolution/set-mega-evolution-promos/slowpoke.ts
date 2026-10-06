import { CardType, Stage, SpecialCondition } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { StoreLike, State, PowerType } from '../../../game';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { AddSpecialConditionsPowerEffect } from '../../../game/store/effects/check-effects';

export class Slowpoke extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 80;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Dopey Face',
      powerType: PowerType.ABILITY,
      text: "This Pokemon can't be Confused.",
    },
  ];

  public attacks = [
    {
      name: 'Super Psy Bolt',
      cost: [P, P, C],
      damage: 50,
      text: '',
    },
  ];

  public regulationMark = 'I';
  public set: string = 'MEP';
  public setNumber = '86';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Slowpoke';
  public fullName: string = 'Slowpoke MEP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Aloof Face - prevent confusion
    if (
      effect instanceof AddSpecialConditionsEffect ||
      effect instanceof AddSpecialConditionsPowerEffect
    ) {
      if (effect.specialConditions.includes(SpecialCondition.CONFUSED)) {
        const targetCard = effect.target.getPokemonCard();
        if (targetCard === this) {
          effect.preventDefault = true;
        }
      }
    }

    return state;
  }
}
