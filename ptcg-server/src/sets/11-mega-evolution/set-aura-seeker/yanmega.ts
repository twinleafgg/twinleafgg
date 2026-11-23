import { CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Yanmega extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Yanma';
  public hp: number = 130;
  public cardType: CardType[] = [G];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [];

  public attacks = [{
    name: 'Damage Beat',
    cost: [G],
    damage: 20,
    damageCalculation: 'x',
    text: 'This attack does 20 damage for each damage counter on your opponent\'s Active Pokémon.'
  },
  {
    name: 'Bug Buzz',
    cost: [G, C, C, C],
    damage: 140,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Yanmega';
  public fullName: string = 'Yanmega FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Damage Beat
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      effect.damage = 20 * Math.floor(opponent.active.damage / 10);
    }

    return state;
  }
}
