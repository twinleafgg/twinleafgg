import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Pikachu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: 10 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    // Spark
    name: 'Spark',
    cost: [L, C],
    damage: 10,
    text: 'Does 10 damage to 2 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'P6';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';
  public name: string = 'Pikachu';
  public fullName: string = 'Pikachu P6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Spark
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state, 0, 2);
    }
    return state;
  }
}
