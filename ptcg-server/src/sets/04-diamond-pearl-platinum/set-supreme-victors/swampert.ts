import { GameMessage, PokemonCard, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { BEFORE_DAMAGE, CONFIRMATION_PROMPT, IS_POKEBODY_BLOCKED, SWITCH_IN_OPPONENT_BENCHED_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Swampert extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Marshtomp';
  public hp: number = 130;
  public cardType: CardType[] = [W];
  public weakness = [{ type: G, value: +30 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Root Protector',
    powerType: PowerType.POKEBODY,
    text: 'Any damage done to Swampert by attacks from your opponent\'s Pokémon that isn\'t an Evolved Pokémon is reduced by 20 (after applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Drag Off',
    cost: [W, C, C],
    damage: 30,
    text: 'Before doing damage, you may switch your opponent\'s Active Pokémon with 1 of his or her Benched Pokémon.'
  }, {
    name: 'Push Over',
    cost: [W, C, C, C],
    damage: 60,
    damageCalculation: '+',
    text: 'Does 60 damage plus 10 more damage for each Fighting Energy attached to Swampert.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Swampert';
  public fullName: string = 'Swampert SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Root Protector
    if (effect instanceof PutDamageEffect && effect.target.getPokemonCard() === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (owner === effect.player || IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      if (effect.source.getPokemons().length <= 1) {
        effect.damage = Math.max(0, effect.damage - 20);
      }
    }

    // Drag Off
    if (BEFORE_DAMAGE(effect, 0, this)) {
      CONFIRMATION_PROMPT(store, state, effect.player, result => {
        if (result) {
          SWITCH_IN_OPPONENT_BENCHED_POKEMON(store, state, effect.player, {
            allowCancel: true,
            sourceEffect: effect.attackEffect,
          });
        }
      }, GameMessage.WANT_TO_SWITCH_POKEMON);
    }

    // Push Over
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergyEffect);
      const fightingCount = checkProvidedEnergyEffect.energyMap.reduce((sum, em) => {
        return sum + em.provides.filter(p => p === CardType.FIGHTING || p === CardType.ANY).length;
      }, 0);
      effect.damage += fightingCount * 10;
    }

    return state;
  }
}
