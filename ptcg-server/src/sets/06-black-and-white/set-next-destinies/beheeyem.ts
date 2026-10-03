import {ADD_CONFUSION_TO_PLAYER_ACTIVE, AFTER_ATTACK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ShowCardsPrompt } from '../../../game/store/prompts/show-cards-prompt';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';

import { CardType, Stage } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { GameMessage } from '../../../game/game-message';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { Card, State, StoreLike } from '../../../game';
export class Beheeyem extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Elgyem';
  public cardType: CardType[] = [P];
  public hp: number = 80;
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Brain Control',
      cost: [P],
      damage: 0,
      text: 'Your opponent reveals his or her hand. Choose a card from there and put it on the bottom of your opponent\'s deck.'
    },
    {
      name: 'Psybeam',
      cost: [P, C, C],
      damage: 40,
      text: 'The Defending Pokémon is now Confused.'
    }
  ];

  public set: string = 'NXD';
  public setNumber: string = '62';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Beheeyem';
  public fullName: string = 'Beheeyem NXD';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Brain Control - reveal hand and put one card on bottom of deck
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.hand.cards.length === 0) {
        return state;
      }

      // Show opponent's hand to player, then choose a card
      return store.prompt(state, new ShowCardsPrompt(
        player.id,
        GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
        opponent.hand.cards
      ), () => {
        // Choose a card to put on bottom of deck
        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          opponent.hand,
          {},
          { min: 1, max: 1, allowCancel: false }
        ), (selected: Card[]) => {
          if (selected && selected.length > 0) {
            // Move chosen card to bottom of opponent's deck
            MOVE_CARDS(store, state, opponent.hand, opponent.deck, { cards: selected, sourceCard: this });
            // Move the card to the bottom (index 0 is bottom)
            const card = selected[0];
            const index = opponent.deck.cards.indexOf(card);
            if (index > -1) {
              opponent.deck.cards.splice(index, 1);
              opponent.deck.cards.unshift(card);
            }
          }
        });
      });
    }

    // Psybeam - confusion
    if (AFTER_ATTACK(effect, 1, this)) {
      ADD_CONFUSION_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
    }

    return state;
  }
}
