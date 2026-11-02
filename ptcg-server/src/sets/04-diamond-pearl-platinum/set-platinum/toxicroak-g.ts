import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, SpecialCondition, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AbstractAttackEffect, ApplyWeaknessEffect, DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ToxicroakG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public powers = [{
    name: 'Anticipation',
    powerType: PowerType.POKEBODY,
    text: 'Prevent all effects of attacks, excluding damage, done to Toxicroak G.'
  }];

  public attacks = [{
    name: 'Deep Poison',
    cost: [P, C],
    damage: 20,
    damageCalculation: '+',
    text: 'If the Defending Pokémon is Poisoned, this attack does 20 damage plus 40 more damage.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '40';
  public name: string = 'Toxicroak G';
  public fullName: string = 'Toxicroak G PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Anticipation
    if (effect instanceof AbstractAttackEffect && effect.target.getPokemonCard() === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (effect.player === owner) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      if (effect instanceof ApplyWeaknessEffect
        || effect instanceof PutDamageEffect
        || effect instanceof DealDamageEffect) {
        return state;
      }
      effect.preventDefault = true;
    }

    // Deep Poison
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.opponent.active.specialConditions.includes(SpecialCondition.POISONED)) {
        effect.damage += 40;
      }
    }

    return state;
  }
}
