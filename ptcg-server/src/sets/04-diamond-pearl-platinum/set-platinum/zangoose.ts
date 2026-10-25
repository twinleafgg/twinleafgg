import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { GUST_OPPONENT_BENCHED_POKEMON, IS_POKEBODY_BLOCKED, PREVENT_AND_CLEAR_SPECIAL_CONDITIONS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Zangoose extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Thick Skin',
    powerType: PowerType.POKEBODY,
    text: 'Zangoose can\'t be affected by any Special Conditions.'
  }];

  public attacks = [{
    name: 'Invite and Strike',
    cost: [C],
    damage: 0,
    text: 'Switch the Defending Pokémon with 1 of your opponent\'s Benched Pokémon. This attack does 20 damage to the new Defending Pokémon.'
  }, {
    name: 'Chop Up',
    cost: [C, C, C],
    damage: 50,
    text: 'Does 10 damage to each of your opponent\'s Benched Pokémon that has any damage counters on it. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '66';
  public name: string = 'Zangoose';
  public fullName: string = 'Zangoose PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Thick Skin
    PREVENT_AND_CLEAR_SPECIAL_CONDITIONS(state, effect, {
      shouldApply: (target, owner) => {
        return target.getPokemonCard() === this && !IS_POKEBODY_BLOCKED(store, state, owner, this);
      }
    });

    // Invite and Strike
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      if (!opponent.bench.some(b => b.cards.length > 0)) {
        return state;
      }
      return GUST_OPPONENT_BENCHED_POKEMON(store, state, effect.player, {
        sourceEffect: effect,
        onSwitched: () => {
          const damageEffect = new DealDamageEffect(effect, 20);
          damageEffect.target = opponent.active;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    // Chop Up
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.opponent.bench.forEach(target => {
        if (target.cards.length > 0 && target.damage > 0) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
