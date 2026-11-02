import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonStatsEffect, CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { IS_POKEBODY_BLOCKED, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Bagon2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C, value: +10 }];
  public retreat = [C];

  public powers = [{
    name: 'Star Barrier',
    powerType: PowerType.POKEBODY,
    text: 'As long as Bagon has any Energy attached to it, Bagon has no Weakness.'
  }];

  public attacks = [{
    name: 'Dragon Rage',
    cost: [C],
    damage: 40,
    text: 'Flip 2 coins. If either of them is tails, this attack does nothing.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'SH10';
  public name: string = 'Bagon';
  public fullName: string = 'Bagon AR2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Star Barrier
    if (effect instanceof CheckPokemonStatsEffect && effect.target.getPokemonCard() === this) {
      const player = StateUtils.findOwner(state, effect.target);
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, effect.target);
      store.reduceEffect(state, checkProvidedEnergy);
      if (checkProvidedEnergy.energyMap.some(em => em.provides.length > 0)) {
        effect.weakness = [];
      }
    }

    // Dragon Rage
    if (WAS_ATTACK_USED(effect, 0, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        if (results.includes(false)) {
          effect.damage = 0;
        }
      });
    }

    return state;
  }
}
