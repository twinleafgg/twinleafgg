import { PokemonCard, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Masquerain extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Surskit';
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: L, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Intimidating Pattern',
    powerType: PowerType.POKEBODY,
    text: 'As long as Masquerain is your Active Pokémon, any damage done by an opponent\'s attack is reduced by 20 (before applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Skim Attack',
    cost: [G],
    damage: 30,
    text: 'Draw 2 cards.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '68';
  public name: string = 'Masquerain';
  public fullName: string = 'Masquerain SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Intimidating Pattern
    if (effect instanceof DealDamageEffect) {
      const targetOwner = StateUtils.findOwner(state, effect.target);
      const sourceOwner = StateUtils.findOwner(state, effect.source);
      if (targetOwner === sourceOwner) {
        return state;
      }
      if (targetOwner.active.getPokemonCard() !== this) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, targetOwner, this)) {
        return state;
      }
      effect.damage = Math.max(0, effect.damage - 20);
    }

    // Skim Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DRAW_CARDS(store, state, effect.player, 2);
    }

    return state;
  }
}
