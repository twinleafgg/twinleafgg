import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';

import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Scorbunny extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.FIRE];
  public hp: number = 60;
  public weakness = [{ type: CardType.WATER }];
  public retreat = [CardType.COLORLESS];

  public attacks = [{
    name: 'Me First',
    cost: [CardType.COLORLESS],
    damage: 0,
    text: 'Draw a card.'
  },
  {
    name: 'Live Coal',
    cost: [CardType.FIRE, CardType.FIRE],
    damage: 20,
    text: ''
  }];

  public regulationMark = 'D';
  public set = 'SWSH';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '71';
  public name = 'Scorbunny';
  public fullName = 'Scorbunny SWSH';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

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