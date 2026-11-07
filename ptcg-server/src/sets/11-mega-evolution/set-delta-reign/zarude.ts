import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Zarude extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [D];
  public hp: number = 130;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Corkscrew Punch',
    cost: [D],
    damage: 20,
    text: ''
  },
  {
    name: 'Deadly Whip',
    cost: [D, C],
    damage: 50,
    damageCalculation: '+',
    text: 'Flip 2 coins. If both of them are heads, this attack does 150 more damage.'
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '71';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Zarude';
  public fullName: string = 'Zarude MEZ';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Special Whip
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        if (results.every(r => r)) {
          effect.damage += 150;
        }
      });
    }

    return state;
  }
}
