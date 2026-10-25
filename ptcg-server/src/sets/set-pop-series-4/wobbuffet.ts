import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Wobbuffet extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public attacks = [{
    // Nap
    name: 'Nap',
    cost: [C],
    damage: 0,
    text: 'Remove 2 damage counters from Wobbuffet.'
  }, {
    // Expand
    name: 'Expand',
    cost: [P, C],
    damage: 20,
    text: 'During your opponent\'s next turn, any damage done to Wobbuffet is reduced by 20 (after applying Weakness and Resistance).'
  }];

  public set: string = 'P4';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '16';
  public name: string = 'Wobbuffet';
  public fullName: string = 'Wobbuffet P4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Nap
    if (WAS_ATTACK_USED(effect, 0, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 20);
    }
    // Expand
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, 20);
    }
    return state;
  }
}
