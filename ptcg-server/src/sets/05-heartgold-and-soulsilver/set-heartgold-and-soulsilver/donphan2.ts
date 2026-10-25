import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Donphan2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Phanpy';
  public hp: number = 100;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Rock Hurl',
    cost: [F, C, C],
    damage: 50,
    text: 'This attack\'s damage isn\'t affected by Resistance.'
  },
  {
    name: 'Double Spin',
    cost: [F, F, C, C],
    damage: 70,
    damageCalculation: 'x',
    text: 'Flip 2 coins. This attack does 70 damage times the number of heads.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '40';
  public name: string = 'Donphan';
  public fullName: string = 'Donphan HS2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rock Hurl
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.ignoreResistance = true;
    }

    // Double Spin
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        effect.damage = 70 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
