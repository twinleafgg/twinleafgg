import { PokemonCard } from '../../game';
import { Stage } from '../../game';
import { CardType } from '../../game';
import { State } from '../../game';
import { StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { FLIP_COIN_FOR_FLY } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Rayquaza extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C }];
  public retreat = [C];

  public attacks = [{
    // Fly
    name: 'Fly',
    cost: [C, C],
    damage: 10,
    text: 'Flip a coin. If tails, this attack does nothing. If heads, prevent all effects of an attack, including damage, done to Rayquaza during your opponent\'s next turn.'
  }, {
    // Dragon Claw
    name: 'Dragon Claw',
    cost: [R, L, C],
    damage: 30,
    text: ''
  }];

  public set: string = 'P1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Rayquaza';
  public fullName: string = 'Rayquaza P1';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fly
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return FLIP_COIN_FOR_FLY(store, state, effect, this);
    }

    return state;
  }
}
