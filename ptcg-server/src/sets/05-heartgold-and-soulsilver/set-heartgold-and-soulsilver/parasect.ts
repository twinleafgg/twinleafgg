import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../../game/store/prefabs/attack-effects';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Parasect extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Paras';
  public hp: number = 90;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Sleep Drain',
    cost: [G],
    damage: 0,
    text: 'The Defending Pokémon is now Asleep. Remove 4 damage counters from Parasect.'
  },
  {
    name: 'Slash',
    cost: [G, G, C],
    damage: 60,
    text: ''
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '48';
  public name: string = 'Parasect';
  public fullName: string = 'Parasect HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sleep Drain
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 40);
    }

    return state;
  }
}
