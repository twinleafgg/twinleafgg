import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Probopass extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Nosepass';
  public hp: number = 90;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: 30 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    // Rock Slide
    name: 'Rock Slide',
    cost: [F, C],
    damage: 20,
    text: 'Does 10 damage to 2 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    // Triple Nose
    name: 'Triple Nose',
    cost: [M, C, C],
    damage: 50,
    damageCalculation: '+',
    text: 'Flip 3 coins. This attack does 50 damage plus 20 more damage for each heads.'
  }];

  public set: string = 'P8';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Probopass';
  public fullName: string = 'Probopass P8';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rock Slide
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state, 0, 2);
    }
    // Triple Nose
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 3, results => {
        effect.damage += 20 * results.filter(r => r).length;
      });
    }
    return state;
  }
}
