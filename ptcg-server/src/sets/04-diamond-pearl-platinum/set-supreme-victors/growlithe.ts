import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Growlithe extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Smash Kick',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    name: 'Fireworks',
    cost: [R, C, C],
    damage: 30,
    text: 'Flip a coin. If tails, discard a Fire Energy attached to Growlithe.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '108';
  public name: string = 'Growlithe';
  public fullName: string = 'Growlithe SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fireworks
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1, CardType.FIRE);
        }
      });
    }

    return state;
  }
}
