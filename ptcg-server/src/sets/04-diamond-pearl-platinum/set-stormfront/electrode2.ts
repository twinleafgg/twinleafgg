import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Electrode2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Voltorb';
  public hp: number = 80;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [];

  public attacks = [{
    // Flash
    name: 'Flash',
    cost: [L],
    damage: 20,
    text: 'If the Defending Pokémon tries to attack during your opponent\'s next turn, your opponent flips a coin. If tails, that attack does nothing.'
  }, {
    // Electro Diffusion
    name: 'Electro Diffusion',
    cost: [C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Does 40 damage plus 10 more damage for each Lightning Energy attached to Electrode. Flip a coin. If tails, discard all Lightning Energy attached to Electrode.'
  }];

  public set: string = 'SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '37';
  public name: string = 'Electrode';
  public fullName: string = 'Electrode SF2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flash
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK(store, state, effect, this);
    }

    // Electro Diffusion
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(effect.player, effect.player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const lightningCount = checkProvidedEnergy.energyMap.reduce((left, em) => {
        return left + em.provides.filter(t => t === L || t === CardType.ANY).length;
      }, 0);
      effect.damage += lightningCount * 10;
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result && lightningCount > 0) {
          DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, lightningCount, L);
        }
      });
    }

    return state;
  }
}
