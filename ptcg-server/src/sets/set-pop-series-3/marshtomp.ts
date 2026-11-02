import { State, StoreLike, CardType, Stage, PokemonCard } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Marshtomp extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Mudkip';
  public hp: number = 70;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    // Mud Slap
    name: 'Mud Slap',
    cost: [F],
    damage: 20,
    text: ''
  },
  {
    // Double-Edge
    name: 'Double-Edge',
    cost: [C, C, C],
    damage: 40,
    text: 'Marshtomp does 10 damage to itself.'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';
  public name: string = 'Marshtomp';
  public fullName: string = 'Marshtomp P3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
    }
    return state;
  }
}
