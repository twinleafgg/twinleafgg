import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StoreLike } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Sceptile extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Grovyle';
  public hp: number = 120;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +30 }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Green Breath',
    powerType: PowerType.POKEBODY,
    text: 'When you attach a Grass Energy card from your hand to Sceptile, remove 2 damage counters from Sceptile.'
  }];

  public attacks = [{
    name: 'Leaf Blast',
    cost: [G],
    damage: 20,
    damageCalculation: 'x',
    text: 'Does 20 damage times the amount of Grass Energy attached to Sceptile.'
  }, {
    name: 'Poison Claws',
    cost: [G, C, C, C],
    damage: 60,
    text: 'The Defending Pokémon is now Poisoned.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '30';
  public name: string = 'Sceptile';
  public fullName: string = 'Sceptile AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Green Breath
    if (effect instanceof AttachEnergyEffect && effect.target.getPokemonCard() === this) {
      if (effect.energyCard.name === 'Grass Energy' && !IS_POKEBODY_BLOCKED(store, state, effect.player, this)) {
        store.reduceEffect(state, new HealEffect(effect.player, effect.target, 20));
      }
    }

    // Leaf Blast
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(effect.player, effect.player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const grass = checkProvidedEnergy.energyMap.reduce((sum, em) => {
        return sum + em.provides.filter(p => p === G || p === CardType.ANY).length;
      }, 0);
      effect.damage = 20 * grass;
    }

    // Poison Claws
    if (WAS_ATTACK_USED(effect, 1, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
    }

    return state;
  }
}
