import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Toxicroak extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Croagunk';
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Corner',
    cost: [F],
    damage: 20,
    text: 'The Defending Pokémon can\'t retreat during your opponent\'s next turn.'
  }, {
    name: 'Convert Blow',
    cost: [C, C],
    damage: 30,
    damageCalculation: '+',
    text: 'If Toxicroak has any Psychic Energy attached to it, the Defending Pokémon is now Poisoned. If Toxicroak has any Fighting Energy attached to it, this attack does 30 damage plus 30 more damage.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Toxicroak';
  public fullName: string = 'Toxicroak AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Corner
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return BLOCK_RETREAT(store, state, effect, this);
    }

    // Convert Blow
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(effect.player, effect.player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const hasPsychic = checkProvidedEnergy.energyMap.some(em => em.provides.includes(P) || em.provides.includes(CardType.ANY));
      const hasFighting = checkProvidedEnergy.energyMap.some(em => em.provides.includes(F) || em.provides.includes(CardType.ANY));
      if (hasPsychic) {
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
      }
      if (hasFighting) {
        effect.damage += 30;
      }
    }

    return state;
  }
}
