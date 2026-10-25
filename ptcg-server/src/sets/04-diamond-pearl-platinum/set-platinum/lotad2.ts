import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect, CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Lotad2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [G];
  public weakness = [{ type: L, value: +10 }];
  public retreat = [C];

  public powers = [{
    name: 'Swift Swim',
    powerType: PowerType.POKEBODY,
    text: 'If Lotad has any Water Energy attached to it, Lotad\'s Retreat Cost is 0.'
  }];

  public attacks = [{
    name: 'Blot',
    cost: [C],
    damage: 10,
    text: 'Remove 1 damage counter from Lotad.'
  }, {
    name: 'Jump On',
    cost: [G, C],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 10 damage plus 20 more damage.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'SH4';
  public name: string = 'Lotad';
  public fullName: string = 'Lotad PL2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Swift Swim
    if (effect instanceof CheckRetreatCostEffect && effect.player.active.getPokemonCard() === this) {
      const player = effect.player;
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const checkEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkEnergy);
      const hasWater = checkEnergy.energyMap.some(em =>
        em.provides.includes(CardType.WATER) || em.provides.includes(CardType.ANY)
      );
      if (hasWater) {
        effect.cost = [];
      }
    }

    // Blot
    if (WAS_ATTACK_USED(effect, 0, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 10);
    }

    // Jump On
    if (WAS_ATTACK_USED(effect, 1, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 20);
    }

    return state;
  }
}
