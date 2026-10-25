import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Gengar2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Haunter';
  public hp: number = 120;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D, value: +30 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Sharpshooting',
    cost: [P, C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 40 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Poison Jab',
    cost: [P, C, C],
    damage: 60,
    text: 'The Defending Pokémon is now Poisoned.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '17';
  public name: string = 'Gengar';
  public fullName: string = 'Gengar AR2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sharpshooting
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(40, effect, store, state);
    }

    // Poison Jab
    if (WAS_ATTACK_USED(effect, 1, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
    }

    return state;
  }
}
