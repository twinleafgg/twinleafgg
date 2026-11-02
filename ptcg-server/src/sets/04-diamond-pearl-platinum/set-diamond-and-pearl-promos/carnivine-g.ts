import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CardTag } from '../../../game/store/card/card-types';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class CarnivineG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Power Whip',
    cost: [C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 10 damage for each Energy attached to Carnivine G to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  },
  {
    name: 'Grass Knot',
    cost: [G, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Does 20 damage plus 10 more damage for each Colorless Energy in the Defending Pokémon\'s Retreat Cost (after applying effects to the Retreat Cost).'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP42';
  public name: string = 'Carnivine G';
  public fullName: string = 'Carnivine G DPP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Power Whip
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const energyCount = checkProvidedEnergy.energyMap.reduce(
        (left, p) => left + p.provides.length,
        0,
      );
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(10 * energyCount, effect, store, state);
    }

    // Grass Knot
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const checkRetreatCostEffect = new CheckRetreatCostEffect(opponent);
      store.reduceEffect(state, checkRetreatCostEffect);
      const colorlessRetreat = checkRetreatCostEffect.cost.filter(c => c === CardType.COLORLESS).length;
      effect.damage += colorlessRetreat * 10;
    }

    return state;
  }
}
