import { State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Porygon2 extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Porygon';

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 80;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [{
    name: 'Double Draw',
    cost: [CardType.COLORLESS],
    damage: 0,
    text: 'Draw 2 cards.'
  }, {
    name: 'Spinning Attack',
    cost: [CardType.COLORLESS, CardType.COLORLESS],
    damage: 30,
    text: ''
  }
  ];

  public set: string = 'UNB';

  public name: string = 'Porygon2';

  public fullName: string = 'Porygon2 UNB';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '156';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      MOVE_CARDS(store, state, player.deck, player.hand, { count: Math.min(player.deck.cards.length, 2), sourceCard: this });
      return state;
    }

    return state;
  }
}