import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, THIS_ATTACK_DOES_X_MORE_DAMAGE, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, THIS_POKEMON_HAS_ANY_DAMAGE_COUNTERS_ON_IT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Vigoroth extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Slakoth';
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Reckless Charge',
    cost: [C],
    damage: 30,
    text: 'Flip a coin. If tails, Vigoroth does 10 damage to itself.'
  }, {
    name: 'Fight Back',
    cost: [C, C, C],
    damage: 50,
    damageCalculation: '+',
    text: 'If Vigoroth has any damage counters on it, this attack does 50 damage plus 20 more damage.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '64';
  public name: string = 'Vigoroth';
  public fullName: string = 'Vigoroth PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Reckless Charge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
        }
      });
    }

    // Fight Back
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (THIS_POKEMON_HAS_ANY_DAMAGE_COUNTERS_ON_IT(effect, this)) {
        THIS_ATTACK_DOES_X_MORE_DAMAGE(effect, store, state, 20);
      }
    }

    return state;
  }
}
