import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Regigigas extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C, C, C, C];

  public attacks = [{
    // Body Slam
    name: 'Body Slam',
    cost: [C, C, C],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.'
  }, {
    // Double Stomp
    name: 'Double Stomp',
    cost: [C, C, C, C],
    damage: 50,
    damageCalculation: '+',
    text: 'Flip 2 coins. This attack does 50 damage plus 20 more damage for each heads.'
  }];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Regigigas';
  public fullName: string = 'Regigigas OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Body Slam
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }
    // Double Stomp
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        effect.damage += 20 * results.filter(r => r).length;
      });
    }
    return state;
  }
}
