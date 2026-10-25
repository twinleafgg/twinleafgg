import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Carnivine extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Stretch Vine',
    cost: [G],
    damage: 0,
    text: 'Choose 2 of your opponent\'s Benched Pokémon. This attack does 10 damage to each of them. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Absorb',
    cost: [C, C],
    damage: 20,
    text: 'Remove 2 damage counters from Carnivine.'
  }, {
    name: 'Vine Extract',
    cost: [G, G],
    damage: 30,
    text: 'If the Defending Pokémon already has any damage counters on it, the Defending Pokémon is now Burned and Poisoned.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '43';
  public name: string = 'Carnivine';
  public fullName: string = 'Carnivine PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Stretch Vine
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const benchedCount = opponent.bench.filter(b => b.cards.length > 0).length;
      if (benchedCount === 0) {
        return state;
      }
      const count = Math.min(2, benchedCount);
      THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state, count, count);
    }

    // Absorb
    if (WAS_ATTACK_USED(effect, 1, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 20);
    }

    // Vine Extract
    if (WAS_ATTACK_USED(effect, 2, this)) {
      if (effect.opponent.active.damage > 0) {
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
      }
    }

    return state;
  }
}
