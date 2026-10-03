import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, GameError, CardList, OrderCardsPrompt, SelectPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {COIN_FLIP_PROMPT, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../../game/store/prefabs/attack-effects';

export class Ralts extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 60;
  public weakness = [{ type: P, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Future Sight',
    cost: [],
    damage: 0,
    text: 'Look at the top 5 cards in either player\'s deck and put them back on top of that player\'s deck in any order.'
  }, {
    name: 'Hypnoblast',
    cost: [P],
    damage: 10,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Asleep.'
  }];

  public set: string = 'PL';
  public name: string = 'Ralts';
  public fullName: string = 'Ralts PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '89';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const options: { message: GameMessage, action: () => void }[] = [
        {
          message: GameMessage.ORDER_YOUR_DECK,
          action: () => {

            if (player.deck.cards.length === 0) {
              throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
            }

            const deckTop = new CardList();
            MOVE_CARDS(store, state, player.deck, deckTop, { count: 5, sourceCard: this });

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
              throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
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

    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }

    return state;
  }
}