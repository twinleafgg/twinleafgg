import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Sudowoodo extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Push Over',
    cost: [F],
    damage: 20,
    damageCalculation: 'x',
    text: 'Does 20 damage times the amount of Fighting Energy attached to Sudowoodo.'
  },
  {
    name: 'Rumble',
    cost: [C, C, C],
    damage: 40,
    text: 'The Defending Pokémon can\'t retreat during your opponent\'s next turn.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';
  public name: string = 'Sudowoodo';
  public fullName: string = 'Sudowoodo UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Push Over
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(effect.player, effect.player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const fighting = checkProvidedEnergy.energyMap.reduce((sum, em) => {
        return sum + em.provides.filter(p => p === CardType.FIGHTING || p === CardType.ANY).length;
      }, 0);
      effect.damage = 20 * fighting;
    }

    // Rumble
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return BLOCK_RETREAT(store, state, effect, this);
    }

    return state;
  }
}
