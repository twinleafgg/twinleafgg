import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { COIN_FLIP_PROMPT, DISCARD_ALL_ENERGY_FROM_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Moltres2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [R];
  public weakness = [];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Hyper Flame',
    cost: [R, R, R],
    damage: 60,
    text: 'Flip a coin. If heads, discard a Fire Energy attached to Moltres. If tails, discard all Energy attached to Moltres.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '149';
  public name: string = 'Moltres';
  public fullName: string = 'Moltres SV2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hyper Flame
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1, CardType.FIRE);
        } else {
          DISCARD_ALL_ENERGY_FROM_POKEMON(store, state, effect, this);
        }
      });
    }

    return state;
  }
}
