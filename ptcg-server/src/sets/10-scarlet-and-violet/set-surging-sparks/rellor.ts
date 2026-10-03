import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Rellor extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.GRASS];

  public hp: number = 40;

  public weakness = [{ type: CardType.FIRE }];

  public retreat = [CardType.COLORLESS];

  public attacks = [
    { name: 'Collect', cost: [CardType.COLORLESS], damage: 0, text: 'Draw a card.' },
    { name: 'Rollout', cost: [CardType.GRASS], damage: 10, text: '' }
  ];

  public set: string = 'SSP';

  public name: string = 'Rellor';

  public fullName: string = 'Rellor SSP';

  public setNumber: string = '13';

  public regulationMark = 'H';

  public cardImage: string = 'assets/cardback.png';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Collect
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
    }

    return state;
  }
}