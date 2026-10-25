import { PokemonCard, Stage, CardType, StoreLike, State } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Phanpy extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    // Double Spin
    name: 'Double Spin',
    cost: [F],
    damage: 10,
    damageCalculation: 'x',
    text: 'Flip 2 coins. This attack does 10 damage times the number of heads.'
  }, {
    // Body Slam
    name: 'Body Slam',
    cost: [C, C],
    damage: 10,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.'
  }];

  public set: string = 'P2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';
  public name: string = 'Phanpy';
  public fullName: string = 'Phanpy P2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Double Spin
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        effect.damage = 10 * results.filter(r => r).length;
      });
    }
    // Body Slam
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }
    return state;
  }
}
