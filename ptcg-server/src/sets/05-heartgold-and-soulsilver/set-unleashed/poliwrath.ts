import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Poliwrath extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Poliwhirl';
  public hp: number = 130;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Steamroll',
    cost: [W, C],
    damage: 40,
    text: 'Does 20 damage to 1 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  },
  {
    name: 'Dynamic Punch',
    cost: [W, C, C],
    damage: 60,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 60 damage plus 40 more damage and the Defending Pokémon is now Confused.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '21';
  public name: string = 'Poliwrath';
  public fullName: string = 'Poliwrath UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Steamroll
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(20, effect, store, state);
    }

    // Dynamic Punch
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          effect.damage += 40;
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
        }
      });
    }

    return state;
  }
}
