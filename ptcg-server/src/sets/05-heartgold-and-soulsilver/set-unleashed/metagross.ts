import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CheckProvidedEnergyEffect, CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Metagross extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Metang';
  public hp: number = 130;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Psychic Float',
    powerType: PowerType.POKEBODY,
    text: 'If you have any Psychic Energy attached to your Active Pokémon, the Retreat Cost for that Pokémon is 0.'
  }];

  public attacks = [{
    name: 'Pulse Blast',
    cost: [C, C],
    damage: 60,
    text: ''
  },
  {
    name: 'Double Leg Hammer',
    cost: [P, P, P],
    damage: 0,
    text: 'Choose 2 of your opponent\'s Benched Pokémon. This attack does 40 damage to each of them. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Metagross';
  public fullName: string = 'Metagross UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Psychic Float
    if (effect instanceof CheckRetreatCostEffect) {
      const player = effect.player;
      if (!StateUtils.isPokemonInPlay(player, this)) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      const checkEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkEnergy);
      const hasPsychic = checkEnergy.energyMap.some(em =>
        em.provides.includes(CardType.PSYCHIC) || em.provides.includes(CardType.ANY)
      );
      if (hasPsychic) {
        effect.cost = [];
      }
    }

    // Double Leg Hammer
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const benched = effect.opponent.bench.filter(b => b.cards.length > 0).length;
      if (benched === 0) {
        return state;
      }
      const count = Math.min(2, benched);
      THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(40, effect, store, state, count, count);
    }

    return state;
  }
}
