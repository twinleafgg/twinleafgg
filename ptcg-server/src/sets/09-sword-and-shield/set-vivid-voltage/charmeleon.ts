import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Charmeleon extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Charmander';

  public cardType: CardType[] = [CardType.FIRE];

  public hp: number = 90;

  public weakness = [{ type: CardType.WATER }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Slash',
      cost: [CardType.FIRE],
      damage: 20,
      text: ''
    },
    {
      name: 'Raging Flames',
      cost: [CardType.FIRE, CardType.FIRE],
      damage: 60,
      text: 'Discard the top 3 cards of your deck.'
    }
  ];

  public set: string = 'VIV';

  public name: string = 'Charmeleon';

  public fullName: string = 'Charmeleon VIV';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '24';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.deck, player.discard, { count: 3, sourceCard: this });
      return state;
    }

    return state;
  }

}
