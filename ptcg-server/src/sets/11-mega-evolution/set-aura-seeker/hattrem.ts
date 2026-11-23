import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Hattrem extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Hatenna';
  public hp: number = 90;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Double Slap',
    cost: [P],
    damage: 30,
    damageCalculation: 'x',
    text: 'Flip 2 coins. This attack does 30 damage for each heads.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '35';
  public name: string = 'Hattrem';
  public fullName: string = 'Hattrem FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Double Slap
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        effect.damage = 30 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
