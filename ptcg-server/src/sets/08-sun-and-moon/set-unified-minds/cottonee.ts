import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Cottonee extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [Y];
  public hp: number = 60;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Dust Gathering',
    cost: [C],
    damage: 0,
    text: 'Draw a card.'
  }];

  public set: string = 'UNM';
  public name: string = 'Cottonee';
  public fullName: string = 'Cottonee UNM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '143';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
      return state;
    }

    return state;
  }
}