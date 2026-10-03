import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, CardList, OrderCardsPrompt, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Gothita extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 50;
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Future Sight',
      cost: [P],
      damage: 0,
      text: 'Look at the top 5 cards of your deck and put them back on top of your deck in any order.'
    }
  ];

  public set: string = 'DRX';
  public setNumber: string = '55';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Gothita';
  public fullName: string = 'Gothita DRX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 1: Future Sight - look at top 5, reorder
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      const count = Math.min(5, player.deck.cards.length);
      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: count, sourceCard: this });

      return store.prompt(state, new OrderCardsPrompt(
        player.id,
        GameMessage.CHOOSE_CARDS_ORDER,
        deckTop,
        { allowCancel: false },
      ), order => {
        if (order === null) {
          return state;
        }

        deckTop.applyOrder(order);
        deckTop.moveToTopOfDestination(player.deck);
      });
    }

    return state;
  }
}
