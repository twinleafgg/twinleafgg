import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, SpecialCondition, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Beautifly extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Silcoon';
  public hp: number = 120;
  public cardType: CardType[] = [G];
  public weakness = [{ type: L, value: +30 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Colorful Powder',
    cost: [G],
    damage: 20,
    damageCalculation: '+',
    text: 'If Beautifly has 2 or less Energy attached to it, the Defending Pokémon is now Poisoned. If Beautifly has 3 Energy attached to it, the Defending Pokémon is now Burned and Poisoned. If Beautifly has 4 or more Energy attached to it, this attack does 20 damage plus 40 more damage and the Defending Pokémon is now Asleep, Burned, and Poisoned.'
  }, {
    name: 'Silver Scale',
    cost: [G],
    damage: 30,
    text: 'If the Defending Pokémon has any Resistance, this attack\'s base damage is 60 damage instead of 30.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '21';
  public name: string = 'Beautifly';
  public fullName: string = 'Beautifly PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Colorful Powder
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(effect.player);
      store.reduceEffect(state, checkProvidedEnergy);
      const energyCount = checkProvidedEnergy.energyMap.length;
      if (energyCount <= 2) {
        store.reduceEffect(state, new AddSpecialConditionsEffect(effect, [SpecialCondition.POISONED]));
      } else if (energyCount === 3) {
        store.reduceEffect(state, new AddSpecialConditionsEffect(effect, [
          SpecialCondition.BURNED,
          SpecialCondition.POISONED,
        ]));
      } else {
        effect.damage += 40;
        store.reduceEffect(state, new AddSpecialConditionsEffect(effect, [
          SpecialCondition.ASLEEP,
          SpecialCondition.BURNED,
          SpecialCondition.POISONED,
        ]));
      }
    }

    // Silver Scale
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const target = effect.opponent.active.getPokemonCard();
      if (target !== undefined && target.resistance.length > 0) {
        effect.damage = 60;
      }
    }

    return state;
  }
}
