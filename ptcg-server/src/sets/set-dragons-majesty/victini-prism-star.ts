import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, CardTag } from '../../game/store/card/card-types';
import { StoreLike, State, EnergyCard, ShuffleDeckPrompt, Card } from '../../game';
import { Effect } from '../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class VictiniPrismStar extends PokemonCard {
  protected _tags = [CardTag.PRISM_STAR];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 90;
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Infinity',
      cost: [R, R],
      damage: 0,
      text:
        'This attack does 20 damage for each basic Energy card in your discard pile. ' +
        'Then, shuffle those cards into your deck.',
    },
  ];

  public set: string = 'DRM';
  public setNumber: string = '7';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Victini Prism Star';
  public fullName: string = 'Victini Prism Star DRM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const shuffleList: Card[] = [];
      player.discard.cards.forEach((c) => {
        if (c instanceof EnergyCard && c.energyType == EnergyType.BASIC) {
          shuffleList.push(c);
        }
      });
      effect.damage = 20 * shuffleList.length;
      MOVE_CARDS(store, state, player.discard, player.deck, { cards: shuffleList, sourceCard: this });
      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
      });
    }

    return state;
  }
}
