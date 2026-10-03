import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF } from '../../../game/store/prefabs/prefabs';

export class Seaking extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Goldeen';
  public cardType: CardType[] = [W];
  public hp: number = 90;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Soaking Horn',
    cost: [W],
    damage: 10,
    damageCalculation: '+',
    text: 'If this Pokémon was healed during this turn, this attack does 80 more damage.'
  },
  {
    name: 'Reckless Charge',
    cost: [C],
    damage: 40,
    text: 'This Pokémon does 10 damage to itself.'
  }];

  public set: string = 'BKT';
  public setNumber: string = '28';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Seaking';
  public fullName: string = 'Seaking BKT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Soaking Horn
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.player.active.healedThisTurn) {
        effect.damage += 80;
      }
    }

    // Reckless Charge
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
    }

    return state;
  }
}
