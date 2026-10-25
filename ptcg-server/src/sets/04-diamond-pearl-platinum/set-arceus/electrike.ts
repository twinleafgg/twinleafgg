import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Electrike extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +10 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Zap Kick',
    cost: [L],
    damage: 10,
    text: ''
  }, {
    name: 'Thunder Jolt',
    cost: [L, C],
    damage: 30,
    text: 'Flip a coin. If tails, Electrike does 10 damage to itself.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '62';
  public name: string = 'Electrike';
  public fullName: string = 'Electrike AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Thunder Jolt
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
        }
      });
    }

    return state;
  }
}
