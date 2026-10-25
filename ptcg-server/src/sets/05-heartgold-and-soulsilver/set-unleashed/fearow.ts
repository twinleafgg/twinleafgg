import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Fearow extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Spearow';
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Wing Attack',
    cost: [C, C],
    damage: 30,
    text: ''
  },
  {
    name: 'Repeating Drill',
    cost: [C, C, C],
    damage: 20,
    damageCalculation: 'x',
    text: 'Flip 5 coins. This attack does 20 damage times the number of heads.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';
  public name: string = 'Fearow';
  public fullName: string = 'Fearow UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Repeating Drill
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 5, results => {
        effect.damage = 20 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
