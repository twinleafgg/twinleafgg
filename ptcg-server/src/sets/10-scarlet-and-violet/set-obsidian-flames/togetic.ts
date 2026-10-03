import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Togetic extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Togepi';
  public cardType: CardType[] = [P];
  public hp: number = 90;
  public weakness = [{ type: M }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Shared Peace',
      cost: [C],
      damage: 0,
      text: 'Each player draws 3 cards.'
    },
    {
      name: 'Speed Dive',
      cost: [C, C],
      damage: 40,
      text: ''
    }
  ];

  public set: string = 'OBF';
  public regulationMark = 'G';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '84';
  public name: string = 'Togetic';
  public fullName: string = 'Togetic OBF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Shared Peace
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
      MOVE_CARDS(store, state, opponent.deck, opponent.hand, { count: 3, sourceCard: this });
    }

    return state;
  }
}
