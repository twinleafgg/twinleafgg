import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { RemoveSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../../game/store/prefabs/attack-effects';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Shaymin extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Flower Aroma',
    cost: [G],
    damage: 10,
    text: 'Remove 2 damage counters from Shaymin. The Defending Pokémon is now Asleep.'
  }, {
    name: 'Damage Aid',
    cost: [G, C],
    damage: 30,
    damageCalculation: '+',
    text: 'If the Defending Pokémon is affected by a Special Condition, this attack does 30 damage plus 50 more damage. Then, remove all Special Conditions from the Defending Pokémon.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '14';
  public name: string = 'Shaymin';
  public fullName: string = 'Shaymin PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flower Aroma
    if (WAS_ATTACK_USED(effect, 0, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 20);
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
    }

    // Damage Aid
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.opponent.active.specialConditions.length > 0) {
        effect.damage += 50;
        const removeSpecialCondition = new RemoveSpecialConditionsEffect(effect, undefined);
        removeSpecialCondition.target = effect.opponent.active;
        store.reduceEffect(state, removeSpecialCondition);
      }
    }

    return state;
  }
}
