import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { ADD_SLEEP_TO_PLAYER_ACTIVE, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../../game/store/prefabs/attack-effects';

export class Slowbro extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Slowpoke';
  public hp: number = 90;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Big Yawn',
    cost: [W],
    damage: 30,
    text: 'Both Slowbro and the Defending Pokémon are now Asleep.'
  },
  {
    name: 'Madkinesis',
    cost: [C, C, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Does 30 damage plus 20 more damage for each Psychic Energy attached to Slowbro.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '52';
  public name: string = 'Slowbro';
  public fullName: string = 'Slowbro HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Big Yawn
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
      ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, effect.player, this);
    }

    // Madkinesis
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(effect.player, effect.player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const psychic = checkProvidedEnergy.energyMap.reduce((sum, em) => {
        return sum + em.provides.filter(p => p === CardType.PSYCHIC || p === CardType.ANY).length;
      }, 0);
      effect.damage += 20 * psychic;
    }

    return state;
  }
}
