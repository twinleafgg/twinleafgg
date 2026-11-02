import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Steelix extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Onix';
  public hp: number = 120;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Guard Press',
    cost: [M, C, C],
    damage: 40,
    text: 'During your opponent\'s next turn, any damage done to Steelix by attacks is reduced by 20 (after applying Weakness and Resistance).'
  },
  {
    name: 'Steel Swing',
    cost: [M, M, C, C],
    damage: 80,
    damageCalculation: 'x',
    text: 'Flip 2 coins. This attack does 80 damage times the number of heads.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '24';
  public name: string = 'Steelix';
  public fullName: string = 'Steelix UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Guard Press
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, 20);
    }

    // Steel Swing
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        effect.damage = 80 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
