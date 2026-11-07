import { CardType, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { AfterDamageEffect, ApplyWeaknessEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { IS_ABILITY_BLOCKED, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Machamp extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Machoke';
  public hp: number = 180;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public resistance = [];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Trained Arms',
    powerType: PowerType.ABILITY,
    text: 'This Pokémon\'s attacks aren\'t affected by Resistance or any effects on your opponent\'s Active Pokémon.'
  }];

  public attacks = [{
    name: 'Guts Fight',
    cost: [F, C, C, C],
    damage: 250,
    text: 'This Pokémon also does 20 damage to itself.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '39';
  public name: string = 'Machamp';
  public fullName: string = 'Machamp FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Trained Arms
    // Ref: set-temporal-forces/walking-wake-ex.ts (damage not affected by any effects on the opponent's Active)
    if (effect instanceof AttackEffect && effect.source.cards.includes(this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      effect.attack.shredAttack = true;

      const opponent = StateUtils.getOpponent(state, player);
      const applyWeakness = new ApplyWeaknessEffect(effect, effect.damage);
      applyWeakness.target = opponent.active;
      applyWeakness.ignoreResistance = true;
      store.reduceEffect(state, applyWeakness);
      const damage = applyWeakness.damage;

      effect.damage = 0;

      if (damage > 0) {
        opponent.active.damage += damage;
        const afterDamage = new AfterDamageEffect(effect, damage);
        state = store.reduceEffect(state, afterDamage);
      }
    }

    // Guts Fight
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 20);
    }

    return state;
  }
}
