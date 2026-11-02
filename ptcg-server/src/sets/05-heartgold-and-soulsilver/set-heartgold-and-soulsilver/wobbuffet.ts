import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Wobbuffet extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Double Return',
    cost: [P, C],
    damage: 20,
    damageCalculation: 'x',
    text: 'Flip a coin. If heads, this attack does 20 damage times the number of damage counters on Wobbuffet.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '13';
  public name: string = 'Wobbuffet';
  public fullName: string = 'Wobbuffet HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Double Return
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          effect.damage = 20 * (effect.player.active.damage / 10);
        } else {
          effect.damage = 0;
        }
      });
    }

    return state;
  }
}
