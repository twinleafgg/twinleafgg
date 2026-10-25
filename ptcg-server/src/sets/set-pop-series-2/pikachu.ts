import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { DealDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Pikachu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 40;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    // Gnaw
    name: 'Gnaw',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    // Thunder Jolt
    name: 'Thunder Jolt',
    cost: [L, C],
    damage: 30,
    text: 'Flip a coin. If tails, Pikachu does 10 damage to itself.'
  }];

  public set: string = 'P2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '16';
  public name: string = 'Pikachu';
  public fullName: string = 'Pikachu P2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Thunder Jolt
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return COIN_FLIP_PROMPT(store, state, effect.player, heads => {
      if (!heads) {
      const damage = new DealDamageEffect(effect, 10);
      damage.target = effect.player.active;
      store.reduceEffect(state, damage);
      }
      });
    }
    return state;
  }
}
