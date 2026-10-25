import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Wigglytuff extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Jigglypuff';
  public hp: number = 90;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Double Slap',
    cost: [C, C],
    damage: 40,
    damageCalculation: 'x',
    text: 'Flip 2 coins. This attack does 40 damage times the number of heads.'
  },
  {
    name: 'Expand',
    cost: [C, C, C],
    damage: 50,
    text: 'During your opponent\'s next turn, any damage done to Wigglytuff by attacks is reduced by 10 (after applying Weakness and Resistance).'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '56';
  public name: string = 'Wigglytuff';
  public fullName: string = 'Wigglytuff HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Double Slap
    if (WAS_ATTACK_USED(effect, 0, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        effect.damage = 40 * results.filter(r => r).length;
      });
    }

    // Expand
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, 10);
    }

    return state;
  }
}
