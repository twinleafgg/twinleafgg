import { PowerType, State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect, CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ArcanineG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [R];
  public hp: number = 90;
  public weakness = [{ type: W, value: +30 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Extreme Speed',
    powerType: PowerType.POKEBODY,
    text: 'Arcanine G\'s Retreat Cost is Colorless less for each Fire Energy attached to Arcanine G.'
  }];

  public attacks = [{
    name: 'Overrun',
    cost: [R, C, C],
    damage: 40,
    text: 'Does 20 damage to 1 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';
  public name: string = 'Arcanine G';
  public fullName: string = 'Arcanine G SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Extreme Speed
    if (effect instanceof CheckRetreatCostEffect && effect.player.active.getPokemonCard() === this) {
      const player = effect.player;
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const checkEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkEnergy);
      let fireCount = 0;
      checkEnergy.energyMap.forEach(em => {
        fireCount += em.provides.filter(t => t === CardType.FIRE || t === CardType.ANY).length;
      });
      for (let i = 0; i < fireCount; i++) {
        const index = effect.cost.indexOf(CardType.COLORLESS);
        if (index !== -1) {
          effect.cost.splice(index, 1);
        }
      }
    }

    // Overrun
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(20, effect, store, state);
    }

    return state;
  }
}
