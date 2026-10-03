import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Charmander extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.FIRE];
  public hp: number = 70;
  public weakness = [{ type: CardType.WATER }];
  public retreat = [CardType.COLORLESS];

  public attacks = [{
    name: 'Collect',
    cost: [CardType.FIRE],
    damage: 0,
    text: 'Draw a card.'
  },
  {
    name: 'Flare',
    cost: [CardType.FIRE, CardType.FIRE],
    damage: 30,
    text: ''
  }];

  public regulationMark = 'D';
  public set = 'SWSH';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '92';
  public name = 'Charmander';
  public fullName = 'Charmander SWSH';

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