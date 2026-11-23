import { CardList, CardType, GameError, GameMessage, OrderCardsPrompt, PokemonCard, SelectPrompt, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Hatenna extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Future Sight',
    cost: [P],
    damage: 0,
    text: 'Look at the top 3 cards of your or your opponent\'s deck and put them back in any order.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '34';
  public name: string = 'Hatenna';
  public fullName: string = 'Hatenna FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Future Sight
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const options: { message: GameMessage, action: () => void }[] = [
        {
          message: GameMessage.ORDER_YOUR_DECK,
          action: () => {
            if (player.deck.cards.length === 0) {
              throw new GameError(GameMessage.CANNOT_USE_ATTACK);
            }

            const deckTop = new CardList();
            MOVE_CARDS(store, state, player.deck, deckTop, { count: Math.min(3, player.deck.cards.length), sourceCard: this });

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
        },
        {
          message: GameMessage.ORDER_OPPONENT_DECK,
          action: () => {
            if (opponent.deck.cards.length === 0) {
              throw new GameError(GameMessage.CANNOT_USE_ATTACK);
            }

            const deckTop = new CardList();
            MOVE_CARDS(store, state, opponent.deck, deckTop, { count: Math.min(3, opponent.deck.cards.length), sourceCard: this });

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
              deckTop.moveToTopOfDestination(opponent.deck);
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
