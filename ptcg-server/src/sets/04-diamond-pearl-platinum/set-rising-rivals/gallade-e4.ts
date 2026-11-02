import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class GalladeE4 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Chop Up',
    cost: [P, C],
    damage: 20,
    text: 'Does 10 damage to each of your opponent\'s Benched Pokémon that has any damage counters on it. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Feint',
    cost: [P, C, C],
    damage: 50,
    text: 'This attack\'s damage isn\'t affected by Resistance.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '20';
  public name: string = 'Gallade E4';
  public fullName: string = 'Gallade E4 RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Chop Up
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.opponent.bench.forEach(target => {
        if (target.cards.length > 0 && target.damage > 0) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    // Feint
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.ignoreResistance = true;
    }

    return state;
  }
}
