import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { ADD_SLEEP_TO_PLAYER_ACTIVE } from '../../../game/store/prefabs/prefabs';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Gloom2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Oddish';
  public hp: number = 80;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C, C];

  public attacks = [{
    // Space Out
    name: 'Space Out',
    cost: [],
    damage: 0,
    text: 'Remove 2 damage counters from Gloom. Gloom is now Asleep.'
  }, {
    // Stinky Nectar
    name: 'Stinky Nectar',
    cost: [P, C],
    damage: 30,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Confused and Poisoned.'
  }];

  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '97';
  public name: string = 'Gloom';
  public fullName: string = 'Gloom LA2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Space Out
    if (WAS_ATTACK_USED(effect, 0, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 20);
      ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, effect.player, this);
    }

    // Stinky Nectar
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
        }
      });
    }

    return state;
  }
}
