import { PokemonCard } from '../../game';
import { Stage } from '../../game';
import { CardType } from '../../game';
import { State } from '../../game';
import { StoreLike } from '../../game';
import { AfterDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../game/store/prefabs/attack-effects';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON } from '../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Sceptile extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Grovyle';
  public hp: number = 100;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public resistance = [{ type: W, value: -30 }];
  public retreat = [C];

  public attacks = [{
    // Cling
    name: 'Cling',
    cost: [G],
    damage: 20,
    text: 'After your attack, remove from Sceptile the number of damage counters equal to the damage you did to the Defending Pokémon. If Sceptile has fewer damage counters than that, remove all of them.'
  }, {
    // Leaf Blade
    name: 'Leaf Blade',
    cost: [G, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 40 damage plus 30 more damage.'
  }];

  public set: string = 'P1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Sceptile';
  public fullName: string = 'Sceptile P1';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cling
    if (effect instanceof AfterDamageEffect && effect.attack === this.attacks[0] && effect.source.getPokemonCard() === this) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect.attackEffect, store, state, effect.damage);
    }

    // Leaf Blade
    if (WAS_ATTACK_USED(effect, 1, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 30);
    }

    return state;
  }
}
