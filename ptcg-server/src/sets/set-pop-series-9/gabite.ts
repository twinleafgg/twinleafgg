import { PokemonCard, Stage, CardType, StoreLike, State } from '../../game';
import { HealTargetEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { FLIP_COIN_TO_PREVENT_DAMAGE_DURING_OPPONENTS_NEXT_TURN } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Gabite extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Gible';
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C, value: 20 }];
  public retreat = [C];

  public attacks = [{
    // Burrow
    name: 'Burrow',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, prevent all damage done to Gabite by attacks during your opponent\'s next turn.'
  }, {
    // Distorted Wave
    name: 'Distorted Wave',
    cost: [C, C, C],
    damage: 60,
    text: 'Before doing damage, remove 2 damage counters from the Defending Pokemon.'
  }];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '8';
  public name: string = 'Gabite';
  public fullName: string = 'Gabite OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return FLIP_COIN_TO_PREVENT_DAMAGE_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const healTarget = new HealTargetEffect(effect, 20);
      return store.reduceEffect(state, healTarget);
    }
    return state;
  }
}
