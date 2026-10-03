import { CardList, GameMessage, OrderCardsPrompt, SelectPrompt, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Duskull extends PokemonCard {

  public regulationMark = 'D';

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [P];

  public hp: number = 60;

  public resistance = [{ type: F, value: -30 }];

  public weakness = [{ type: D }];

  public retreat = [C];

  public attacks = [
    {
      name: 'Future Sight',
      cost: [C],
      damage: 0,
      text: 'Look at the top 4 cards of either player\'s deck and put them back in any order.'
    }
  ];

  public set: string = 'VIV';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '69';

  public name: string = 'Duskull';

  public fullName: string = 'Duskull VIV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Future Sight
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const options: { message: GameMessage, action: () => void }[] = [
        {
          message: GameMessage.ORDER_OPPONENT_DECK,
          action: () => {

            const opponentDeckTop = new CardList();
            MOVE_CARDS(store, state, opponent.deck, opponentDeckTop, { count: 4, sourceCard: this });

            return store.prompt(state, new OrderCardsPrompt(
              player.id,
              GameMessage.CHOOSE_CARDS_ORDER,
              opponentDeckTop,
              { allowCancel: false },
            ), order => {
              if (order === null) {
                return state;
              }

              opponentDeckTop.applyOrder(order);
              opponentDeckTop.moveToTopOfDestination(opponent.deck);

            });
          }
        },
        {
          message: GameMessage.ORDER_YOUR_DECK,
          action: () => {
            const player = effect.player;

            const playerDeckTop = new CardList();
            MOVE_CARDS(store, state, player.deck, playerDeckTop, { count: 4, sourceCard: this });

            return store.prompt(state, new OrderCardsPrompt(
              player.id,
              GameMessage.CHOOSE_CARDS_ORDER,
              playerDeckTop,
              { allowCancel: false },
            ), order => {
              if (order === null) {
                return state;
              }

              playerDeckTop.applyOrder(order);
              playerDeckTop.moveToTopOfDestination(player.deck);
            });
          }
        }
      ];
      return store.prompt(state, new SelectPrompt(
        player.id,
        GameMessage.CHOOSE_OPTION,
        options.map(opt => opt.message),
        { allowCancel: false }
      ), choice => {
        const option = options[choice];
        option.action();
      });
    }

    return state;
  }
}