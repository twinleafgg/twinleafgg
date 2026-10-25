import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckPokemonStatsEffect, CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Shinx2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +10 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Star Barrier',
    powerType: PowerType.POKEBODY,
    text: 'As long as Shinx has any Energy attached to it, Shinx has no Weakness.'
  }];

  public attacks = [{
    name: 'Payback',
    cost: [L],
    damage: 10,
    damageCalculation: '+',
    text: 'If your opponent has only 1 Prize card left, this attack does 10 damage plus 30 more damage.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'SH12';
  public name: string = 'Shinx';
  public fullName: string = 'Shinx AR2';

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

    // Payback
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const prizesLeft = opponent.prizes.filter(p => p.cards.length > 0).length;
      if (prizesLeft === 1) {
        effect.damage += 30;
      }
    }

    return state;
  }
}
