import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../../game/store/prefabs/attack-effects';
import { FLIP_UNTIL_TAILS_AND_COUNT_HEADS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Pelipper extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Wingull';
  public hp: number = 90;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Water Pulse',
    cost: [W, C],
    damage: 30,
    text: 'The Defending Pokémon is now Asleep.'
  }, {
    name: 'Continuous Crush',
    cost: [W, W, C, C],
    damage: 70,
    text: 'Flip a coin until you get tails. For each heads, discard an Energy card attached to the Defending Pokémon.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '24';
  public name: string = 'Pelipper';
  public fullName: string = 'Pelipper AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Water Pulse
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
    }

    // Continuous Crush
    if (WAS_ATTACK_USED(effect, 1, this)) {
      FLIP_UNTIL_TAILS_AND_COUNT_HEADS(store, state, effect.player, headsCount => {
        DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(store, state, effect, undefined, headsCount);
      });
    }

    return state;
  }
}
