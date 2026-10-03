import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Rabsca extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Rellor';

  public cardType: CardType[] = [CardType.GRASS];

  public hp: number = 70;

  public weakness = [{ type: CardType.FIRE }];

  public retreat = [CardType.COLORLESS];

  public attacks = [
    { name: 'Triple Draw', cost: [CardType.COLORLESS], damage: 0, text: 'Draw 3 cards.' },
    { name: 'Counterturn', cost: [CardType.GRASS], damage: 40, text: 'If there are 3 or fewer cards in your deck, this attack does 200 more damage.' }
  ];

  public set: string = 'SSP';

  public name: string = 'Rabsca';

  public fullName: string = 'Rabsca SSP';

  public setNumber: string = '14';

  public regulationMark = 'H';

  public cardImage: string = 'assets/cardback.png';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Triple Draw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
    }

    // Counterturn
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      if (player.deck.cards.length <= 3) { effect.damage += 200; }
    }

    return state;
  }
}