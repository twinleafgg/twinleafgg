import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, Card, GameLog } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShowCardsPrompt } from '../../../game/store/prompts/show-cards-prompt';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';

export class Persian extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Meowth';
  public cardType: CardType[] = [C];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Nasty Plot',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a card and put it into your hand. Shuffle your deck afterward.'
  }, {
    name: 'Shadow Claw',
    cost: [C, C],
    damage: 30,
    text: 'Flip a coin. If heads, discard a random card from your opponent\'s hand.'
  }];

  public set: string = 'NXD';
  public setNumber: string = '81';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Persian';
  public fullName: string = 'Persian NXD';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Nasty Plot - search deck for any card
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        {},
        { min: 1, max: 1, allowCancel: true }
      ), (selected: Card[]) => {
        const cards = selected || [];

        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

          store.prompt(state, new ShowCardsPrompt(
            opponent.id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            cards
          ), () => { });
        }

        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }

    // Shadow Claw - flip coin for random discard
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.hand.cards.length === 0) {
        return state;
      }

      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (result && opponent.hand.cards.length > 0) {
          // Discard random card from opponent's hand
          const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
          const cardToDiscard = opponent.hand.cards[randomIndex];
          MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: [cardToDiscard], sourceCard: this });

          store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, { name: opponent.name, card: cardToDiscard.name });
        }
      });
    }

    return state;
  }
}
