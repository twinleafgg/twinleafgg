import { PokemonCard, Stage, CardType, StoreLike, State } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Jolteon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Eevee';
  public hp: number = 70;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -30 }];
  public retreat = [];

  public attacks = [{
    // Thundershock
    name: 'Thundershock',
    cost: [L, C],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.'
  }, {
    // Pin Missile
    name: 'Pin Missile',
    cost: [L, C, C],
    damage: 20,
    damageCalculation: 'x',
    text: 'Flip 4 coins. This attack does 20 damage times the number of heads.'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Jolteon';
  public fullName: string = 'Jolteon P3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Thundershock
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }
    // Pin Missile
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 4, results => {
        effect.damage = 20 * results.filter(r => r).length;
      });
    }
    return state;
  }
}
