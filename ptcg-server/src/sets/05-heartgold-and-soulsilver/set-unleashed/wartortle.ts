import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Wartortle extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Squirtle';
  public hp: number = 80;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [{
    name: 'Water Arrow',
    cost: [W],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 20 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  },
  {
    name: 'Surf',
    cost: [W, C, C],
    damage: 50,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '42';
  public name: string = 'Wartortle';
  public fullName: string = 'Wartortle UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Water Arrow
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(20, effect, store, state);
    }

    return state;
  }
}
