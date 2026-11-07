import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_ALL_ENERGY_FROM_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Jolteon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Eevee';
  public cardType: CardType[] = [L];
  public hp: number = 110;
  public weakness = [{ type: F }];
  public retreat = [];

  public attacks = [{
    name: 'Tackle',
    cost: [L],
    damage: 30,
    text: ''
  },
  {
    name: 'Thunderbolt',
    cost: [L, L, L],
    damage: 220,
    text: 'Discard all Energy from to this Pokémon.'
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '32';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Jolteon';
  public fullName: string = 'Jolteon MEE';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Thunderbolt
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_ALL_ENERGY_FROM_POKEMON(store, state, effect, this);
    }

    return state;
  }
}
