import { PokemonCard, CardType, Stage, PowerType, State, StateUtils, StoreLike } from '../../game';
import { DealDamageEffect, PutDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, IS_POKEBODY_BLOCKED, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Luxray extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Luxio';
  public hp: number = 120;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: 30 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public powers = [{
    // Intimidating Fang
    name: 'Intimidating Fang',
    powerType: PowerType.POKEBODY,
    text: 'As long as Luxray is your Active Pokémon, any damage done by an opponent\'s attack is reduced by 10 (before applying Weakness and Resistance).'
  }];

  public attacks = [{
    // Thunder
    name: 'Thunder',
    cost: [L, L, L, C],
    damage: 120,
    text: 'Flip a coin. If tails, Luxray does 40 damage to itself.'
  }];

  public set: string = 'P8';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Luxray';
  public fullName: string = 'Luxray P8';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Intimidating Fang
    if (effect instanceof DealDamageEffect || effect instanceof PutDamageEffect) {
      const player = StateUtils.findOwner(state, effect.target);
      const opponent = StateUtils.getOpponent(state, player);
      if (effect.player !== opponent) {
        return state;
      }
      if (player.active.getPokemonCard() !== this) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      effect.damage = Math.max(0, effect.damage - 10);
    }
    // Thunder
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 40);
        }
      });
    }
    return state;
  }
}
