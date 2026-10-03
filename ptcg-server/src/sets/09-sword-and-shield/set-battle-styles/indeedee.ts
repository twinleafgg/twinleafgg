import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Indeedee extends PokemonCard {

  public regulationMark = 'E';

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 90;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Collect',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: 'Draw 2 cards.'
    },
    {
      name: 'Hand Kinesis',
      cost: [CardType.COLORLESS, CardType.COLORLESS],
      damage: 10,
      text: 'This attack does 10 damage for each card in your hand.'
    }
  ];

  public set: string = 'BST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '120';

  public name: string = 'Indeedee';

  public fullName: string = 'Indeedee BST';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {

      const damage = effect.player.hand.cards.length;

      effect.damage += damage;
    }

    return state;
  }
}

