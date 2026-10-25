import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Torterra extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Grotle';
  public hp: number = 140;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +30 }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Green Blast',
    cost: [G, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Does 40 damage plus 10 more damage for each Grass Energy attached to all of your Pokémon.'
  }, {
    name: 'Soothing Scent',
    cost: [G, G, C, C],
    damage: 80,
    text: 'The Defending Pokémon is now Asleep.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '39';
  public name: string = 'Torterra';
  public fullName: string = 'Torterra PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Green Blast
    if (WAS_ATTACK_USED(effect, 0, this)) {
      let energies = 0;
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(effect.player, cardList);
        store.reduceEffect(state, checkProvidedEnergyEffect);
        checkProvidedEnergyEffect.energyMap.forEach(energy => {
          energies += energy.provides.filter(p => p === G).length;
        });
      });
      effect.damage += energies * 10;
    }

    // Soothing Scent
    if (WAS_ATTACK_USED(effect, 1, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
    }

    return state;
  }
}
