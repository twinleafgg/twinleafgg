import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, SpecialCondition, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_FOR_EACH_POKEMON_IN_YOUR_DISCARD_PILE } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Kricketune extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Kricketot';
  public hp: number = 90;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Revenge Melody',
    cost: [C, C],
    damage: 20,
    damageCalculation: 'x',
    text: 'Does 20 damage times the number of Kricketot and Kricketune in your discard pile.'
  }, {
    name: 'Bug Buzz',
    cost: [G, G],
    damage: 50,
    damageCalculation: '+',
    text: 'If the Defending Pokémon is Asleep, this attack does 50 damage plus 30 more damage. Remove the Special Condition Asleep from the Defending Pokémon.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '32';
  public name: string = 'Kricketune';
  public fullName: string = 'Kricketune PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Revenge Melody
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_FOR_EACH_POKEMON_IN_YOUR_DISCARD_PILE(
        20,
        card => card.name === 'Kricketot' || card.name === 'Kricketune',
        effect
      );
    }

    // Bug Buzz
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.opponent.active.specialConditions.includes(SpecialCondition.ASLEEP)) {
        effect.damage += 30;
      }
      effect.opponent.active.removeSpecialCondition(SpecialCondition.ASLEEP);
    }

    return state;
  }
}
