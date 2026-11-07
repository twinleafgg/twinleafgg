import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Tauros extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 130;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Raging Horns',
    cost: [C, C],
    damage: 50,
    damageCalculation: '+',
    text: 'This attack does 10 more damage for each damage counter on this Pokémon.'
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '77';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Tauros';
  public fullName: string = 'Tauros MEE';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Raging Horns
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage += effect.player.active.damage;
    }

    return state;
  }
}
