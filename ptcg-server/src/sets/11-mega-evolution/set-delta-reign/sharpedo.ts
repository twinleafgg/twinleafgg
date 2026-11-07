import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';

export class Sharpedo extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Carvanha';
  public cardType: CardType[] = [D];
  public hp: number = 120;
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Crunch',
    cost: [D, C],
    damage: 60,
    text: 'Flip a coin. If heads, discard an Energy from your opponent\'s Active Pokémon.'
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '62';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Sharpedo';
  public fullName: string = 'Sharpedo MEZ';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Crunch
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(store, state, effect);
        }
      });
    }

    return state;
  }
}
