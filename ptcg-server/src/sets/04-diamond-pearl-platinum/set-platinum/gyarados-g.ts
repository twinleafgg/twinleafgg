import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, PokemonCardList, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class GyaradosG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 110;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Wriggle',
    cost: [W, C, C],
    damage: 0,
    text: 'Flip a coin for each of your opponent\'s Pokémon. If that coin flip is heads, this attack does 30 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Dwindling Wave',
    cost: [W, W, C, C],
    damage: 100,
    damageCalculation: '-',
    text: 'Does 100 damage minus 10 damage for each damage counter on Gyarados G.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '30';
  public name: string = 'Gyarados G';
  public fullName: string = 'Gyarados G PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Wriggle
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      const targets: PokemonCardList[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        targets.push(cardList);
      });
      if (targets.length === 0) {
        return state;
      }
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, targets.length, results => {
        results.forEach((heads, index) => {
          if (!heads) {
            return;
          }
          const target = targets[index];
          if (target === opponent.active) {
            const damageEffect = new DealDamageEffect(effect, 30);
            damageEffect.target = target;
            store.reduceEffect(state, damageEffect);
          } else {
            const damageEffect = new PutDamageEffect(effect, 30);
            damageEffect.target = target;
            store.reduceEffect(state, damageEffect);
          }
        });
      });
    }

    // Dwindling Wave
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.damage = Math.max(0, 100 - effect.player.active.damage);
    }

    return state;
  }
}
