import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Doduo extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L, value: +10 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Take Down',
    cost: [C],
    damage: 20,
    text: 'Doduo does 10 damage to itself.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '102';
  public name: string = 'Doduo';
  public fullName: string = 'Doduo SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Take Down
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
    }

    return state;
  }
}
