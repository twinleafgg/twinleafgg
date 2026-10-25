import { CardType, PokemonCard, SpecialCondition, Stage, State, StoreLike } from '../../../game';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Nidorina extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Nidoran ♀';
  public hp: number = 80;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Jump Tackle',
    cost: [C],
    damage: 30,
    text: 'Nidorina does 10 damage to itself, and don\'t apply Weakness and Resistance to this damage.'
  },
  {
    name: 'Stress Poison',
    cost: [P, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'If Nidorina has any damage counters on it, this attack does 40 damage plus 20 more damage and the Defending Pokémon is now Poisoned.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '73';
  public name: string = 'Nidorina';
  public fullName: string = 'Nidorina RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Jump Tackle
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const ignoreWeakness = effect.ignoreWeakness;
      const ignoreResistance = effect.ignoreResistance;
      effect.ignoreWeakness = true;
      effect.ignoreResistance = true;
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
      effect.ignoreWeakness = ignoreWeakness;
      effect.ignoreResistance = ignoreResistance;
    }

    // Stress Poison
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.player.active.damage > 0) {
        effect.damage += 20;
        store.reduceEffect(state, new AddSpecialConditionsEffect(effect, [SpecialCondition.POISONED]));
      }
    }

    return state;
  }
}
