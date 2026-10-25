import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PUT_X_DAMAGE_COUNTERS_ON_YOUR_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Duskull2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D, value: +10 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public attacks = [{
    // Silhouette
    name: 'Silhouette',
    cost: [P],
    damage: 0,
    text: 'Put 1 damage counter on the Defending Pokémon. If the Defending Pokémon already has any damage counters on it, put 2 damage counters on that Pokémon instead.'
  }, {
    // Will-o'-the-wisp
    name: 'Will-o\'-the-wisp',
    cost: [C, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '59';
  public name: string = 'Duskull';
  public fullName: string = 'Duskull SF2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Silhouette
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const counters = effect.opponent.active.damage > 0 ? 2 : 1;
      PUT_X_DAMAGE_COUNTERS_ON_YOUR_OPPONENTS_ACTIVE_POKEMON(counters, store, state, effect);
    }

    return state;
  }
}
