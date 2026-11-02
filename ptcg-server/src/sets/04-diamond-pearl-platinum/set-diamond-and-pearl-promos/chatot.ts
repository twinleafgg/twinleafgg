import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { DRAW_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Chatot extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L, value: 10 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Me First',
    cost: [C],
    damage: 0,
    text: 'Draw a card.'
  },
  {
    name: 'Tone-Deaf',
    cost: [C],
    damage: 10,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Confused.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP14';
  public name: string = 'Chatot';
  public fullName: string = 'Chatot DPP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Me First
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DRAW_CARDS(store, state, effect.player, 1);
    }

    // Tone-Deaf
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
        }
      });
    }

    return state;
  }
}
