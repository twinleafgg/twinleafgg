import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { SpecialCondition, Stage, CardType } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED } from '../../../game/store/prefabs/attack-effects';
import { PREVENT_DAMAGE } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Heatran extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 140;
  public weakness = [{ type: W }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Singe',
    cost: [R],
    damage: 0,
    text: "Your opponent's Active Pokémon is now Burned.",
  },
  {
    name: 'Lava Wall',
    cost: [R, R, C],
    damage: 120,
    text: "During your opponent's next turn, prevent all damage done to this Pokémon by attacks from Burned Pokémon.",
  }];

  public set: string = 'PBL';
  public setNumber: string = '7';
  public regulationMark: string = 'J';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Heatran';
  public fullName: string = 'Heatran M5';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Singe
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
    }
    // Lava Wall
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return PREVENT_DAMAGE(store, state, effect, this, {
        sourceHasSpecialCondition: SpecialCondition.BURNED,
      });
    }

    return state;
  }
}
