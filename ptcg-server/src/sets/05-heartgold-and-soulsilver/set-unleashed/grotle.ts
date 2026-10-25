import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Grotle extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Turtwig';
  public hp: number = 90;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Razor Leaf',
    cost: [G, C],
    damage: 30,
    text: ''
  },
  {
    name: 'Sleep Powder',
    cost: [G, C, C],
    damage: 50,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Asleep.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '31';
  public name: string = 'Grotle';
  public fullName: string = 'Grotle UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sleep Powder
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
        }
      });
    }

    return state;
  }
}
