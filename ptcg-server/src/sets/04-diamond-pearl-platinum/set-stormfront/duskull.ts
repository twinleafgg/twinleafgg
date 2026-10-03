import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { PUT_X_DAMAGE_COUNTERS_ON_YOUR_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { YOUR_OPPONENT_CANNOT_ATTACH_ENERGY_FROM_HAND_TO_DEFENDING_POKEMON } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Duskull extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 60;
  public weakness = [{ type: D, value: +10 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Counting Song',
    cost: [],
    damage: 0,
    text: 'Put up to 3 damage counters on Duskull. Then, put that many damage counters on the Defending Pokémon.'
  },
  {
    name: 'Ram',
    cost: [P],
    damage: 10,
    text: ''
  },
  {
    name: 'Night Bind',
    cost: [P, C],
    damage: 20,
    text: 'Flip a coin. If heads, your opponent can\'t attach any Energy cards from his or her hand to the Active Pokémon during his or her next turn.'
  }];

  public set: string = 'SF';
  public name: string = 'Duskull';
  public fullName: string = 'Duskull SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'SH2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Counting Song
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.source.damage += 30;
      PUT_X_DAMAGE_COUNTERS_ON_YOUR_OPPONENTS_ACTIVE_POKEMON(3, store, state, effect);
    }

    // Night Bind
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const attack = effect;
      return COIN_FLIP_PROMPT(store, state, attack.player, result => {
        if (result) {
          YOUR_OPPONENT_CANNOT_ATTACH_ENERGY_FROM_HAND_TO_DEFENDING_POKEMON(store, state, attack, this);
        }
      });
    }

    return state;
  }
}