import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { BLOCK_SELF_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Swablu2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L, value: +10 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Roost',
    cost: [],
    damage: 0,
    text: 'Remove 4 damage counters from Swablu. Swablu can\'t retreat during your next turn.'
  }, {
    name: 'Mirror Move',
    cost: [C],
    damage: 0,
    text: 'If Swablu was damaged by an attack during your opponent\'s last turn, this attack does the same amount of damage done to Swablu to the Defending Pokémon.'
  }, {
    name: 'Fury Attack',
    cost: [C],
    damage: 10,
    damageCalculation: 'x',
    text: 'Flip 3 coins. This attack does 10 damage times the number of heads.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'SH5';
  public name: string = 'Swablu';
  public fullName: string = 'Swablu PL2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Roost
    if (WAS_ATTACK_USED(effect, 0, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 40);
      return BLOCK_SELF_RETREAT(store, state, effect, this);
    }

    // Mirror Move
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.damage = this.damageTakenLastTurn ?? 0;
    }

    // Fury Attack
    if (WAS_ATTACK_USED(effect, 2, this)) {
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 3, results => {
        effect.damage = 10 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
