import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Charmeleon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Charmander';
  public hp: number = 80;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Slam',
    cost: [C, C],
    damage: 30,
    damageCalculation: 'x',
    text: 'Flip 2 coins. This attack does 30 damage times the number of heads.'
  }, {
    name: 'Fire Punch',
    cost: [R, C, C],
    damage: 50,
    text: ''
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '35';
  public name: string = 'Charmeleon';
  public fullName: string = 'Charmeleon AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Slam
    if (WAS_ATTACK_USED(effect, 0, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        const heads = results.filter(r => r).length;
        effect.damage = 30 * heads;
      });
    }

    return state;
  }
}
