import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  CardList,
  ShuffleDeckPrompt,
  GameMessage,
  ShowCardsPrompt,
  StateUtils,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class IronThorns extends PokemonCard {
  public stage: Stage = Stage.BASIC;

  protected _tags = [CardTag.FUTURE];

  public cardType: CardType[] = [L];

  public hp: number = 140;

  public weakness = [{ type: F }];

  public resistance = [];

  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Destructo-Press',
      cost: [L, C],
      damage: 70,
      damageCalculation: 'x',
      text: 'Reveal the top 5 cards of your deck. This attack does 70 damage times for each Future card you find there. Then, discard the revealed Future cards and shuffle the other cards back into your deck.',
    },
    { name: 'Megaton Lariat', cost: [L, L, L, C], damage: 140, text: '' },
  ];

  public set: string = 'TEF';

  public regulationMark = 'H';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '62';

  public name: string = 'Iron Thorns';

  public fullName: string = 'Iron Thorns TEF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 5, sourceCard: this });

      // Filter for item cards
      const futureCards = deckTop.cards.filter(
        (c) => c instanceof PokemonCard && c.hasTag(CardTag.FUTURE),
      );

      if (futureCards.length > 0) {
        state = store.prompt(
          state,
          new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, futureCards),
          () => state,
        );
      }

      if (futureCards.length > 0) {
        state = store.prompt(
          state,
          new ShowCardsPrompt(player.id, GameMessage.CARDS_SHOWED_BY_EFFECT, futureCards),
          () => state,
        );
      }

      // Move item cards to hand
      MOVE_CARDS(store, state, deckTop, player.discard, { cards: futureCards, sourceCard: this });

      // Move all cards to discard
      MOVE_CARDS(store, state, deckTop, player.deck, { count: deckTop.cards.length, sourceCard: this });

      effect.damage = 70 * futureCards.length;

      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);

        return state;
      });
    }

    return state;
  }
}
