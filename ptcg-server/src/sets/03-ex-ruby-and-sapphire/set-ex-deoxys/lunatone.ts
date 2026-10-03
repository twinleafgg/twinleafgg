import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, GameError, PowerType, StateUtils, PlayerType, CardList, OrderCardsPrompt, SelectPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import {IS_POKEBODY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Lunatone extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 60;
  public weakness = [{ type: W }];
  public retreat = [C];

  public powers = [{
    name: 'Moonglow',
    powerType: PowerType.POKEBODY,
    text: 'The Retreat Cost for each Solrock you have in play is 0.'
  }];

  public attacks = [
    {
      name: 'Foresight',
      cost: [C],
      damage: 0,
      text: 'Look at the top 5 cards of either player\'s deck and put them back on top of that player\'s deck in any order.'
    },
    {
      name: 'Target Beam',
      cost: [F, C],
      damage: 20,
      damageCalculation: '+',
      text: 'Does 20 damage plus 10 more damage for each Solrock you have in play.'
    }
  ];

  public set: string = 'DX';
  public setNumber: string = '36';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Lunatone';
  public fullName: string = 'Lunatone DX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof CheckRetreatCostEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      const active = effect.player.active.getPokemonCard();

      if (owner !== player || active === undefined) {
        return state;
      }

      let isLunatoneInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card === this) {
          isLunatoneInPlay = true;
        }
      });

      if (!isLunatoneInPlay) {
        return state;
      }

      if (!IS_POKEBODY_BLOCKED(store, state, player, this) && active.name === 'Solrock') {
        effect.cost = [];
      }
      return state;
    }

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
      const player = effect.player;
      let solrockCount = 0;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (card.name === 'Solrock') {
          solrockCount++;
        }
      });

      // Modify damage based on count
      effect.damage += 10 * solrockCount;
    }

    return state;
  }
}