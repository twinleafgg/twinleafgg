import { PokemonCard } from '../../../game';
import { PokemonCardList } from '../../../game';
import { PowerType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { SpecialCondition } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { AddSpecialConditionsPowerEffect } from '../../../game/store/effects/check-effects';
import { CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class Hoothoot extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Insomnia',
    powerType: PowerType.POKEBODY,
    text: 'Hoothoot can\'t be Asleep.'
  }];

  public attacks = [{
    name: 'Peck',
    cost: [C],
    damage: 10,
    text: ''
  }];

  public set: string = 'HSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Hoothoot';
  public fullName: string = 'Hoothoot HSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Insomnia
    if (
      (effect instanceof AddSpecialConditionsEffect || effect instanceof AddSpecialConditionsPowerEffect) &&
      effect.target.getPokemonCard() === this
    ) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (!IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        effect.specialConditions = effect.specialConditions.filter(sc => sc !== SpecialCondition.ASLEEP);
        if (effect.specialConditions.length === 0) {
          effect.preventDefault = true;
        }
      }
    }

    if (effect instanceof CheckTableStateEffect) {
      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;
      const owner = StateUtils.findOwner(state, cardList);
      if (StateUtils.isPokemonInPlay(owner, this) && cardList.getPokemonCard() === this) {
        if (!IS_POKEBODY_BLOCKED(store, state, owner, this)) {
          cardList.removeSpecialCondition(SpecialCondition.ASLEEP);
        }
      }
    }

    return state;
  }
}
