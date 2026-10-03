import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { CardList, GameError, GameMessage, OrderCardsPrompt, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {AFTER_ATTACK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Gothorita extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Gothita';
  public cardType: CardType[] = [P];
  public hp: number = 90;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Fortunate Eye',
    cost: [P],
    damage: 0,
    text: 'Look at the top 5 cards of your opponent\'s deck and put them back in any order.'
  },
  {
    name: 'Psyshot',
    cost: [P, C],
    damage: 40,
    text: ''
  }];

  public set: string = 'WHT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '42';
  public name: string = 'Gothorita';
  public fullName: string = 'Gothorita WHT';
  public regulationMark = 'I';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      if (opponent.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      const deckTop = new CardList();
      MOVE_CARDS(store, state, opponent.deck, deckTop, { count: 5, sourceCard: this });

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

    return state;
  }
}