import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Liepard extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Purrloin';
  public cardType: CardType[] = [D];
  public hp: number = 110;
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Follow-Up Claw',
    cost: [D],
    damage: 20,
    damageCalculation: 'x',
    text: 'This attack does 20 damage for each damage counter on your opponent\'s Active Pokémon.'
  },
  {
    name: 'Slash',
    cost: [D, C, C],
    damage: 90,
    text: ''
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '65';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Liepard';
  public fullName: string = 'Liepard MEZ';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Pursuit Claw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const damageCounters = Math.floor(opponent.active.damage / 10);
      effect.damage = 20 * damageCounters;
    }

    return state;
  }
}
