import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Chinchou2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +10 }];
  public retreat = [C];

  public attacks = [{
    // Razor Fin
    name: 'Razor Fin',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    // Aqua Spark
    name: 'Aqua Spark',
    cost: [L, C],
    damage: 20,
    damageCalculation: '+',
    text: 'If Chinchou has any Water Energy attached to it, this attack does 20 damage plus 10 more damage.'
  }];

  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '88';
  public name: string = 'Chinchou';
  public fullName: string = 'Chinchou LA2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Aqua Spark
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(effect.player, effect.player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const hasWater = checkProvidedEnergy.energyMap.some(em =>
        em.provides.includes(W) || em.provides.includes(CardType.ANY)
      );
      if (hasWater) {
        effect.damage += 10;
      }
    }

    return state;
  }
}
