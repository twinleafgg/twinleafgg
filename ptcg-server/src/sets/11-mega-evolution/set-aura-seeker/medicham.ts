import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PUT_X_DAMAGE_COUNTERS_IN_ANY_WAY_YOU_LIKE } from '../../../game/store/prefabs/attack-effects';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Medicham extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Meditite';
  public hp: number = 120;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Yoga Power',
    cost: [P],
    damage: 0,
    text: 'Put 3 damage counters on your opponent\'s Pokémon in any way you like.'
  },
  {
    name: 'Guts Fight',
    cost: [C, C, C],
    damage: 140,
    text: 'This Pokémon also does 20 damage to itself.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '29';
  public name: string = 'Medicham';
  public fullName: string = 'Medicham FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Yoga Power
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return PUT_X_DAMAGE_COUNTERS_IN_ANY_WAY_YOU_LIKE(3, store, state, effect);
    }

    // Guts Fight
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 20);
    }

    return state;
  }
}
