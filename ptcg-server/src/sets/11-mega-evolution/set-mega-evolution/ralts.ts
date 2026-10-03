import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Ralts extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 70;

  public weakness = [{ type: CardType.DARK }];

  public retreat = [CardType.COLORLESS];

  public attacks = [
    {
      name: 'Collect',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: 'Draw a card.'
    },
    {
      name: 'Headbutt',
      cost: [CardType.PSYCHIC],
      damage: 10,
      text: ''
    }
  ];

  public regulationMark = 'I';
  public set: string = 'MEG';
  public setNumber: string = '58';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Ralts';

  public fullName: string = 'Ralts M1S';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
    }

    return state;
  }
} 
