import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { CheckAttackCostEffect, CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Wailmer extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Hydro Pump',
    cost: [W, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Does 20 damage plus 10 more damage for each Water Energy attached to Wailmer but not used to pay for this attack\'s Energy cost. You can\'t add more than 20 damage in this way.'
  }, {
    name: 'Take Down',
    cost: [W, C, C],
    damage: 50,
    text: 'Wailmer does 20 damage to itself.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '87';
  public name: string = 'Wailmer';
  public fullName: string = 'Wailmer SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hydro Pump
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkCost = new CheckAttackCostEffect(player, this.attacks[0]);
      state = store.reduceEffect(state, checkCost);
      const waterCost = checkCost.cost.filter(c => c === W).length;
      const checkEnergy = new CheckProvidedEnergyEffect(player, player.active);
      state = store.reduceEffect(state, checkEnergy);
      let waterProvided = 0;
      checkEnergy.energyMap.forEach(em => {
        waterProvided += em.provides.filter(p => p === W || p === CardType.ANY).length;
      });
      const extraWater = Math.min(Math.max(0, waterProvided - waterCost), 2);
      if (extraWater > 0) {
        effect.damage += extraWater * 10;
      }
    }

    // Take Down
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 20);
    }

    return state;
  }
}
