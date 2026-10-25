import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Hitmontop extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [{
    name: 'Triple Kick',
    cost: [F],
    damage: 20,
    damageCalculation: 'x',
    text: 'Flip 3 coins. This attack does 20 damage times the number of heads.'
  },
  {
    name: 'Close Combat',
    cost: [F, C, C],
    damage: 60,
    text: 'During your opponent\'s next turn, any damage done to Hitmontop by attacks is increased by 20 (after applying Weakness and Resistance).'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Hitmontop';
  public fullName: string = 'Hitmontop HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Triple Kick
    if (WAS_ATTACK_USED(effect, 0, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 3, results => {
        effect.damage = 20 * results.filter(r => r).length;
      });
    }

    // Close Combat
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.player.active.damageReductionNextTurn = -20;
    }

    return state;
  }
}
