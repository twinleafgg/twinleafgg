import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { SuperType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Lanturn2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Chinchou';
  public hp: number = 90;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C, C];

  public attacks = [{
    // Energy Split
    name: 'Energy Split',
    cost: [L],
    damage: 0,
    text: 'This attack does 30 damage to each of your opponent\'s Pokémon that has any Energy cards attached to it. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    // Aqua Bolt
    name: 'Aqua Bolt',
    cost: [L, C, C],
    damage: 60,
    damageCalculation: '+',
    text: 'Does 60 damage plus 10 more damage for each Water Energy attached to Lanturn.'
  }];

  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '59';
  public name: string = 'Lanturn';
  public fullName: string = 'Lanturn LA2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Split
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      const hasEnergy = (list: typeof opponent.active) =>
        list.cards.some(c => c.superType === SuperType.ENERGY);

      if (hasEnergy(opponent.active)) {
        store.reduceEffect(state, new DealDamageEffect(effect, 30));
      }
      opponent.bench.filter(b => b.cards.length > 0 && hasEnergy(b)).forEach(target => {
        const damageEffect = new PutDamageEffect(effect, 30);
        damageEffect.target = target;
        store.reduceEffect(state, damageEffect);
      });
    }

    // Aqua Bolt
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(effect.player, effect.player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const waterCount = checkProvidedEnergy.energyMap.reduce((left, em) => {
        return left + em.provides.filter(t => t === W || t === CardType.ANY).length;
      }, 0);
      effect.damage += waterCount * 10;
    }

    return state;
  }
}
