import { PokemonCard, Stage, CardType, StoreLike, State } from '../../game';
import { CheckAttackCostEffect, CheckProvidedEnergyEffect } from '../../game/store/effects/check-effects';
import { Effect } from '../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Vaporeon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Eevee';
  public hp: number = 70;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [{
    // Bite
    name: 'Bite',
    cost: [C],
    damage: 20,
    text: ''
  }, {
    // Water Gun
    name: 'Water Gun',
    cost: [W, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Does 30 damage plus 20 more damage for each Water Energy attached to Vaporeon but not used to pay for this attack\'s Energy cost. You can\'t add more than 40 damage in this way.'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Vaporeon';
  public fullName: string = 'Vaporeon P3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Water Gun
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const checkCost = new CheckAttackCostEffect(player, this.attacks[1]);
      state = store.reduceEffect(state, checkCost);
      const checkEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkEnergy);
      const waterEnergy = checkEnergy.energyMap.filter(e => e.provides.includes(W) || e.provides.includes(CardType.ANY));
      const extraWaterEnergy = waterEnergy.length - checkCost.cost.filter(c => c === W).length;
      if (extraWaterEnergy === 1) effect.damage += 20;
      if (extraWaterEnergy >= 2) effect.damage += 40;
    }
    return state;
  }
}
