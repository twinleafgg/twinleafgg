import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Roselia extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Vine Slap',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    name: 'Spit Poison',
    cost: [G, C],
    damage: 10,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Poisoned.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '123';
  public name: string = 'Roselia';
  public fullName: string = 'Roselia SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Spit Poison
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
        }
      });
    }

    return state;
  }
}
