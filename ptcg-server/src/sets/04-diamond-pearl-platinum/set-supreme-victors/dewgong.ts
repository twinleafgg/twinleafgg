import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Dewgong extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Seel';
  public hp: number = 100;
  public cardType: CardType[] = [W];
  public weakness = [{ type: M, value: +20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Thick Fat',
    powerType: PowerType.POKEBODY,
    text: 'Any damage done to Dewgong by attacks from Fire Pokémon and Water Pokémon is reduced by 30 (after applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Ice Shard',
    cost: [W, C],
    damage: 30,
    text: 'If the Defending Pokémon is a Fighting Pokémon, this attack\'s base damage is 80 instead of 30.'
  }, {
    name: 'Aurora Beam',
    cost: [W, W, C, C],
    damage: 70,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '24';
  public name: string = 'Dewgong';
  public fullName: string = 'Dewgong SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Thick Fat
    if (effect instanceof PutDamageEffect && effect.target.getPokemonCard() === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      const checkType = new CheckPokemonTypeEffect(effect.source);
      store.reduceEffect(state, checkType);
      if (checkType.cardTypes.includes(R) || checkType.cardTypes.includes(W)) {
        effect.reduceDamage(30);
      }
    }

    // Ice Shard
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const checkType = new CheckPokemonTypeEffect(effect.opponent.active);
      store.reduceEffect(state, checkType);
      if (checkType.cardTypes.includes(F)) {
        effect.damage = 80;
      }
    }

    return state;
  }
}
