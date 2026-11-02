import { CardType, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Milotic2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Feebas';
  public hp: number = 80;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Aqua Mirage',
    powerType: PowerType.POKEBODY,
    text: 'If you have no cards in your hand, prevent all damage done to Milotic by attacks from your opponent\'s Pokémon.'
  }];

  public attacks = [{
    name: 'Dwindling Wave',
    cost: [W, W, C],
    damage: 80,
    damageCalculation: '-',
    text: 'Does 80 damage minus 10 damage for each damage counter on Milotic.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'SH7';
  public name: string = 'Milotic';
  public fullName: string = 'Milotic SV2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Aqua Mirage
    if ((effect instanceof PutDamageEffect || effect instanceof DealDamageEffect) && effect.target.getPokemonCard() === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (owner.hand.cards.length === 0 && !IS_POKEBODY_BLOCKED(store, state, owner, this) && effect.player !== owner) {
        effect.preventDefault = true;
        return state;
      }
    }

    // Dwindling Wave
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage = Math.max(0, 80 - effect.player.active.damage);
    }

    return state;
  }
}
