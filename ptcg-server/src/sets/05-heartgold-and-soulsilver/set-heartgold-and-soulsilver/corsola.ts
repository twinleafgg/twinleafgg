import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';

export class Corsola extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [W];
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Recover',
    cost: [W],
    damage: 0,
    text: 'Discard a Water Energy attached to Corsola and remove all damage counters from Corsola.'
  },
  {
    name: 'Hyper Cannon',
    cost: [W, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Flip 2 coins. If both of them are heads, this attack does 20 damage plus 50 more damage.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '37';
  public name: string = 'Corsola';
  public fullName: string = 'Corsola HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Recover
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergy);
      const hasWater = checkProvidedEnergy.energyMap.some(em =>
        em.provides.includes(CardType.WATER) || em.provides.includes(CardType.ANY)
      );
      if (hasWater) {
        DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1, CardType.WATER);
        HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, player.active.damage);
      }
    }

    // Hyper Cannon
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        if (results.every(r => r)) {
          effect.damage += 50;
        }
      });
    }

    return state;
  }
}
