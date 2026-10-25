import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { ADD_POISON_TO_PLAYER_ACTIVE, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Forretress extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Pineco';
  public hp: number = 70;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public attacks = [{
    // Tackle
    name: 'Tackle',
    cost: [C, C],
    damage: 20,
    text: ''
  }, {
    // Toxic
    name: 'Toxic',
    cost: [G, G, C],
    damage: 20,
    text: 'The Defending Pokémon is now Poisoned. Put 2 damage counters instead of 1 on the Defending Pokémon between turns.'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';
  public name: string = 'Forretress';
  public fullName: string = 'Forretress P3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Toxic
    if (WAS_ATTACK_USED(effect, 1, this)) {
      ADD_POISON_TO_PLAYER_ACTIVE(store, state, effect.opponent, this, 20);
    }
    return state;
  }
}
