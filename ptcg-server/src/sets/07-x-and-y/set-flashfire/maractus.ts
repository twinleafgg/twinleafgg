import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT } from '../../../game/store/prefabs/prefabs';
import { ARM_NEXT_TURN_COIN_FLIP_COUNT, COIN_FLIPS_FOR_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Maractus extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 90;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Exciting Shake',
    cost: [G],
    damage: 0,
    text: 'During your next turn, flip 6 coins instead of 2 for this Pokémon\'s Prickly Needles attack.'
  },
  {
    name: 'Prickly Needles',
    cost: [C, C],
    damage: 20,
    damageCalculation: 'x',
    text: 'Flip 2 coins. This attack does 20 damage times the number of heads.'
  }];

  public set: string = 'FLF';
  public setNumber: string = '10';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Maractus';
  public fullName: string = 'Maractus FLF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Exciting Shake
    if (WAS_ATTACK_USED(effect, 0, this)) {
      ARM_NEXT_TURN_COIN_FLIP_COUNT(effect.player.active, 'Prickly Needles', 6, this.fullName);
    }
    // Prickly Needles
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const numCoins = COIN_FLIPS_FOR_ATTACK(player.active, 'Prickly Needles', 2);
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, numCoins, results => {
        const heads = results.filter(r => r).length;
        effect.damage = 20 * heads;
      });
    }

    return state;
  }
}
