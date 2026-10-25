import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ADD_CONFUSION_TO_PLAYER_ACTIVE, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Tauros extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Smash Kick',
    cost: [C, C],
    damage: 20,
    text: ''
  },
  {
    name: 'Crimson Bull',
    cost: [C, C],
    damage: 30,
    damageCalculation: 'x',
    text: 'Flip 3 coins. This attack does 30 damage times the number of heads. Tauros is now Confused.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '41';
  public name: string = 'Tauros';
  public fullName: string = 'Tauros UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Crimson Bull
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 3, results => {
        effect.damage = 30 * results.filter(r => r).length;
      });
      ADD_CONFUSION_TO_PLAYER_ACTIVE(store, state, effect.player, this);
    }

    return state;
  }
}
