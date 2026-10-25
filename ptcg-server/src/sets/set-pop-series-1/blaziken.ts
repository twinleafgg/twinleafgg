import { PokemonCard } from '../../game';
import { Stage } from '../../game';
import { CardType } from '../../game';
import { State } from '../../game';
import { StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT } from '../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Blaziken extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Combusken';
  public hp: number = 110;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [{
    // Fire Punch
    name: 'Fire Punch',
    cost: [R, C],
    damage: 40,
    text: ''
  }, {
    // Double Kick
    name: 'Double Kick',
    cost: [C, C, C],
    damage: 50,
    damageCalculation: 'x',
    text: 'Flip 2 coins. This attack does 50 damage times the number of heads.'
  }];

  public set: string = 'P1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Blaziken';
  public fullName: string = 'Blaziken P1';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Double Kick
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        effect.damage = 50 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
