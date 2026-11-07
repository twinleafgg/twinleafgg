import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class HakamoO extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Jangmo-o';
  public cardType: CardType[] = [N];
  public hp: number = 100;
  public weakness = [];
  public retreat = [C, C];

  public attacks = [{
    name: 'Double Smash',
    cost: [L, F],
    damage: 70,
    damageCalculation: 'x',
    text: 'Flip 2 coins. This attack does 70 damage for each heads.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '74';
  public name: string = 'Hakamo-o';
  public fullName: string = 'Hakamo-o M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Double Smash
    if (WAS_ATTACK_USED(effect, 0, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        const heads = results.filter(result => result).length;
        effect.damage = 70 * heads;
      });
    }

    return state;
  }
}
