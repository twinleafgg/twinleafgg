import { State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ArceusFire extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 80;
  public weakness = [{ type: W }];
  public retreat = [C];
  protected _tags = [CardTag.ARCEUS];

  public attacks = [{
    name: 'Bright Flame',
    cost: [R, C, C],
    damage: 80,
    text: 'Flip a coin. If tails, discard 2 Energy attached to Arceus.',
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'AR3';
  public name: string = 'Arceus';
  public fullName: string = 'Arceus Fire AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Bright Flame
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      COIN_FLIP_PROMPT(store, state, player, (result) => {
        if (!result) {
          DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 2);
        }
      });
    }

    return state;
  }
}
