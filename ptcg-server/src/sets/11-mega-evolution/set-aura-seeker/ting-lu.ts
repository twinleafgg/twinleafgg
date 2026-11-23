import { CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class TingLu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 140;
  public cardType: CardType[] = [D];
  public weakness = [{ type: G }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Smash Down',
    cost: [D, D, C],
    damage: 80,
    text: ''
  },
  {
    name: 'Heavy Bomber',
    cost: [D, D, D, C],
    damage: 250,
    damageCalculation: '-',
    text: 'This attack does 50 less damage for each Energy in your opponent\'s Active Pokémon\'s Retreat Cost.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '55';
  public name: string = 'Ting-Lu';
  public fullName: string = 'Ting-Lu FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Heavy Bomber
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const checkRetreat = new CheckRetreatCostEffect(opponent);
      store.reduceEffect(state, checkRetreat);
      effect.damage -= 50 * checkRetreat.cost.length;
      if (effect.damage < 0) {
        effect.damage = 0;
      }
    }

    return state;
  }
}
