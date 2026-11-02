import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { AbstractAttackEffect, DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Rapidash extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Ponyta';
  public hp: number = 80;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +20 }];
  public retreat = [];

  public powers = [{
    name: 'Wild Guard',
    powerType: PowerType.POKEBODY,
    text: 'Prevent all effects of attacks, including damage, done to Rapidash by your opponent\'s Pokémon SP.'
  }];

  public attacks = [{
    name: 'Fire Mane',
    cost: [R],
    damage: 20,
    text: ''
  }, {
    name: 'Rising Lunge',
    cost: [R, C, C],
    damage: 50,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 50 damage plus 20 more damage.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '28';
  public name: string = 'Rapidash';
  public fullName: string = 'Rapidash AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Wild Guard
    if ((effect instanceof PutDamageEffect || effect instanceof DealDamageEffect || effect instanceof AbstractAttackEffect)
      && effect.target.getPokemonCard() === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (effect.player === owner) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      const source = effect.source.getPokemonCard();
      if (source?.hasTag(CardTag.POKEMON_SP)) {
        effect.preventDefault = true;
      }
    }

    // Rising Lunge
    if (WAS_ATTACK_USED(effect, 1, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 20);
    }

    return state;
  }
}
