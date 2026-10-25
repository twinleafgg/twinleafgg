import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Eevee extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    // Tackle
    name: 'Tackle',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    // Take Down
    name: 'Take Down',
    cost: [C, C],
    damage: 30,
    text: 'Eevee does 10 damage to itself.'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '13';
  public name: string = 'Eevee';
  public fullName: string = 'Eevee P3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Take Down
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
    }
    return state;
  }
}
