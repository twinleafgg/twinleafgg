import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED } from '../../../game/store/prefabs/attack-effects';

export class Bagon extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Smash Kick',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    name: 'Super Singe',
    cost: [R, C],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Burned.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '52';
  public name: string = 'Bagon';
  public fullName: string = 'Bagon AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Super Singe
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
        }
      });
    }

    return state;
  }
}
