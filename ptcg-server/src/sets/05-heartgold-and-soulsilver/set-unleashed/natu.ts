import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AFTER_ATTACK, SWITCH_ACTIVE_WITH_BENCHED } from '../../../game/store/prefabs/prefabs';

export class Natu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [P];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Peck',
    cost: [C],
    damage: 10,
    text: ''
  },
  {
    name: 'Teleport',
    cost: [P],
    damage: 0,
    text: 'Switch Natu with 1 of your Benched Pokémon.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '55';
  public name: string = 'Natu';
  public fullName: string = 'Natu UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Teleport
    if (AFTER_ATTACK(effect, 1, this)) {
      SWITCH_ACTIVE_WITH_BENCHED(store, state, effect.player);
    }

    return state;
  }
}
