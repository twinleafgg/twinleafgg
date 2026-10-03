import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  CardList,
  OrderCardsPrompt,
  SelectPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Absolex extends PokemonCard {
  public regulationMark = 'G';

  protected _tags = [CardTag.POKEMON_ex];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.DARK];

  public hp: number = 210;

  public weakness = [{ type: CardType.GRASS }];

  public retreat = [CardType.COLORLESS];

  public attacks = [
    {
      name: 'Future Sight',
      cost: [CardType.DARK],
      damage: 0,
      text: "Look at the top 3 cards of either player's deck and put them back in any order.",
    },
    {
      name: 'Cursed Slug',
      cost: [CardType.DARK, CardType.DARK, CardType.COLORLESS],
      damage: 100,
      damageCalculation: '+',
      text: 'If your opponent has 3 or fewer cards in their hand, this attack does 120 more damage.',
    },
  ];

  public set: string = 'OBF';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '135';

  public name: string = 'Absol ex';

  public fullName: string = 'Absol ex OBF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const options: { message: GameMessage; action: () => void }[] = [
        {
          message: GameMessage.ORDER_OPPONENT_DECK,
          action: () => {
            const opponentDeckTop = new CardList();
            MOVE_CARDS(store, state, opponent.deck, opponentDeckTop, { count: 3, sourceCard: this });

            return store.prompt(
              state,
              new OrderCardsPrompt(player.id, GameMessage.CHOOSE_CARDS_ORDER, opponentDeckTop, {
                allowCancel: false,
              }),
              (order) => {
                if (order === null) {
                  return state;
                }

                opponentDeckTop.applyOrder(order);
                opponentDeckTop.moveToTopOfDestination(opponent.deck);
              },
            );
          },
        },
        {
          message: GameMessage.ORDER_YOUR_DECK,
          action: () => {
            const player = effect.player;

            const playerDeckTop = new CardList();
            MOVE_CARDS(store, state, player.deck, playerDeckTop, { count: 3, sourceCard: this });

            return store.prompt(
              state,
              new OrderCardsPrompt(player.id, GameMessage.CHOOSE_CARDS_ORDER, playerDeckTop, {
                allowCancel: false,
              }),
              (order) => {
                if (order === null) {
                  return state;
                }

                playerDeckTop.applyOrder(order);
                playerDeckTop.moveToTopOfDestination(player.deck);
              },
            );
          },
        },
      ];
      return store.prompt(
        state,
        new SelectPrompt(
          player.id,
          GameMessage.CHOOSE_OPTION,
          options.map((opt) => opt.message),
          { allowCancel: false },
        ),
        (choice) => {
          const option = options[choice];
          option.action();
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const handCount = opponent.hand.cards.length;
      if (handCount <= 3) {
        effect.damage += 120;
      }
    }
    return state;
  }
}
