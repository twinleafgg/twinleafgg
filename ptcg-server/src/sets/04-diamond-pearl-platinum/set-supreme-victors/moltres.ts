import { PokemonCard, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Moltres extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +30 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Wing Attack',
    cost: [R, C],
    damage: 20,
    text: ''
  }, {
    name: 'Sky Attack',
    cost: [R, R, C, C],
    damage: 80,
    text: 'Flip a coin. If tails, this attack does nothing.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '36';
  public name: string = 'Moltres';
  public fullName: string = 'Moltres SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sky Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          effect.damage = 0;
        }
      });
    }

    return state;
  }
}
