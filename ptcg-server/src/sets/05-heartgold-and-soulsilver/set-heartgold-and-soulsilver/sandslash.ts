import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Sandslash extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Sandshrew';
  public hp: number = 80;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Poison Sting',
    cost: [F, C],
    damage: 30,
    text: 'The Defending Pokémon is now Poisoned.'
  },
  {
    name: 'Fury Swipes',
    cost: [F, C, C],
    damage: 30,
    damageCalculation: 'x',
    text: 'Flip 3 coins. This attack does 30 damage times the number of heads.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '29';
  public name: string = 'Sandslash';
  public fullName: string = 'Sandslash HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Poison Sting
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
    }

    // Fury Swipes
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 3, results => {
        effect.damage = 30 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
