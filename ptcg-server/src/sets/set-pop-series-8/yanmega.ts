import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../game/store/prefabs/attack-effects';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../game/store/prefabs/costs';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Yanmega extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Yanma';
  public hp: number = 90;
  public cardType: CardType[] = [G];
  public weakness = [{ type: L, value: 20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public attacks = [{
    // Supersonic
    name: 'Supersonic',
    cost: [G],
    damage: 0,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Confused.'
  }, {
    // Air Slash
    name: 'Air Slash',
    cost: [C, C, C, C],
    damage: 70,
    text: 'Flip a coin. If tails, discard an Energy attached to Yanmega.'
  }];

  public set: string = 'P8';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Yanmega';
  public fullName: string = 'Yanmega P8';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Supersonic
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
        }
      });
    }
    // Air Slash
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return COIN_FLIP_PROMPT(store, state, effect.player, result => {
      if (!result) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1);
      }
      });
    }
    return state;
  }
}
