import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class AlolanGrimer extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.DARK];

  public hp: number = 80;

  public weakness = [{ type: CardType.FIGHTING }];

  public resistance = [{ type: CardType.PSYCHIC, value: -20 }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [{
    name: 'Collect',
    cost: [],
    damage: 0,
    text: 'Draw 2 cards.'
  }, {
    name: 'Sludge Bomb',
    cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
    damage: 30,
    text: ''
  }];

  public set: string = 'UNM';

  public name: string = 'Alolan Grimer';

  public fullName: string = 'Alolan Grimer UNM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '127';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 2, sourceCard: this });
      return state;
    }

    return state;
  }
}