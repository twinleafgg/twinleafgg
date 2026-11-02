import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonStatsEffect, CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { ADD_BURN_TO_PLAYER_ACTIVE, CONFIRMATION_PROMPT, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';

export class Arcanine extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Growlithe';
  public hp: number = 100;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Flare Condition',
    powerType: PowerType.POKEBODY,
    text: 'As long as Arcanine has any Fire Energy attached to it, Arcanine has no Weakness.'
  }];

  public attacks = [{
    name: 'Burn Out',
    cost: [R, C],
    damage: 30,
    damageCalculation: '+',
    text: 'You may do 30 damage plus 30 more damage. If you do, Arcanine is now Burned.'
  }, {
    name: 'Flames of Rage',
    cost: [R, C, C],
    damage: 60,
    damageCalculation: '+',
    text: 'Discard a Fire Energy attached to Arcanine. This attack does 60 damage plus 10 more damage for each damage counter on Arcanine.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Arcanine';
  public fullName: string = 'Arcanine RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flare Condition
    if (effect instanceof CheckPokemonStatsEffect && effect.target.getPokemonCard() === this) {
      const player = StateUtils.findOwner(state, effect.target);
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, effect.target);
      store.reduceEffect(state, checkProvidedEnergy);
      if (checkProvidedEnergy.energyMap.some(em => em.provides.includes(R) || em.provides.includes(CardType.ANY))) {
        effect.weakness = [];
      }
    }

    // Burn Out
    if (WAS_ATTACK_USED(effect, 0, this)) {
      CONFIRMATION_PROMPT(store, state, effect.player, result => {
        if (result) {
          effect.damage += 30;
          ADD_BURN_TO_PLAYER_ACTIVE(store, state, effect.player, this);
        }
      });
    }

    // Flames of Rage
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1, R);
      effect.damage += effect.player.active.damage;
    }

    return state;
  }
}
