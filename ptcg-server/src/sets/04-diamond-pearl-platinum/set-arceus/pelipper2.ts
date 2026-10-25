import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Pelipper2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Wingull';
  public hp: number = 90;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Water Ball',
    cost: [C],
    damage: 20,
    damageCalculation: '+',
    text: 'Does 20 damage plus 10 more damage for each Water Energy attached to Pelipper.'
  }, {
    name: 'Wing Attack',
    cost: [W, C, C],
    damage: 60,
    text: ''
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '45';
  public name: string = 'Pelipper';
  public fullName: string = 'Pelipper AR2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Water Ball
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(effect.player, effect.player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const waterCount = checkProvidedEnergy.energyMap.reduce((left, em) => {
        return left + em.provides.filter(p => p === W || p === CardType.ANY).length;
      }, 0);
      effect.damage += waterCount * 10;
    }

    return state;
  }
}
