import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { IS_POKEBODY_BLOCKED, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class HippowdonE4 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W, value: +20 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Sand Armor',
    powerType: PowerType.POKEBODY,
    text: 'If Hippowdon E4 has any Fighting Energy attached to it, any damage done to Hippowdon E4 by attacks is reduced by 10 (after applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Bite and Crush',
    cost: [C, C, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Flip 2 coins. This attack does 30 damage plus 10 more damage for each heads.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '42';
  public name: string = 'Hippowdon E4';
  public fullName: string = 'Hippowdon E4 RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sand Armor
    if (effect instanceof PutDamageEffect && effect.target.getPokemonCard() === this) {
      const player = StateUtils.findOwner(state, effect.target);
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, effect.target);
      store.reduceEffect(state, checkProvidedEnergy);
      if (checkProvidedEnergy.energyMap.some(em => em.provides.includes(F) || em.provides.includes(CardType.ANY))) {
        effect.reduceDamage(10);
      }
    }

    // Bite and Crush
    if (WAS_ATTACK_USED(effect, 0, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        effect.damage += 10 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
