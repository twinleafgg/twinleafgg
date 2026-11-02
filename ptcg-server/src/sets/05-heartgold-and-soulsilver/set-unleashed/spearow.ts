import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { BLOCK_SELF_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Spearow extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Roost',
    cost: [C],
    damage: 0,
    text: 'Remove 4 damage counters from Spearow. Spearow can\'t retreat during your next turn.'
  },
  {
    name: 'Flap',
    cost: [C],
    damage: 10,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '62';
  public name: string = 'Spearow';
  public fullName: string = 'Spearow UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Roost
    if (WAS_ATTACK_USED(effect, 0, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 40);
      return BLOCK_SELF_RETREAT(store, state, effect, this);
    }

    return state;
  }
}
