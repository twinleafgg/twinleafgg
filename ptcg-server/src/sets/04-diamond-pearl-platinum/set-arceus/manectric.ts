import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Manectric extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Electrike';
  public hp: number = 90;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Second Bite',
    cost: [L, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Does 20 damage plus 10 more damage for each damage counter on the Defending Pokémon.'
  }, {
    name: 'Swift',
    cost: [L, C, C],
    damage: 50,
    text: 'This attack\'s damage isn\'t affected by Weakness, Resistance, Poké-Powers, Poké-Bodies, or any other effects on the Defending Pokémon.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '22';
  public name: string = 'Manectric';
  public fullName: string = 'Manectric AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Second Bite
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage += effect.opponent.active.damage;
    }

    // Swift
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.damage = 0;
      effect.opponent.active.damage += 50;
      const afterDamage = new AfterDamageEffect(effect, 50);
      afterDamage.target = effect.opponent.active;
      store.reduceEffect(state, afterDamage);
    }

    return state;
  }
}
