import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, ChooseCardsPrompt, GameMessage, ShowCardsPrompt, ShuffleDeckPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Togepi extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 50;
  public weakness = [{ type: M }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Whiny Voice',
      cost: [C],
      damage: 0,
      text: 'Choose a random card from your opponent\'s hand. Your opponent reveals that card and shuffles it into their deck.'
    },
    {
      name: 'Rolling Tackle',
      cost: [C, C],
      damage: 20,
      text: ''
    }
  ];

  public set: string = 'OBF';
  public regulationMark = 'G';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  public name: string = 'Togepi';
  public fullName: string = 'Togepi OBF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Whiny Voice
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.hand.cards.length === 0) {
        return state;
      }

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        opponent.hand,
        {},
        { allowCancel: false, min: 1, max: 1, isSecret: true }
      ), cards => {
        cards = cards || [];

        store.prompt(state, new ShowCardsPrompt(
          player.id,
          GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
          cards
        ), () => []);

        MOVE_CARDS(store, state, opponent.hand, opponent.deck, { cards: cards, sourceCard: this });

        return store.prompt(state, new ShuffleDeckPrompt(opponent.id), order => {
          opponent.deck.applyOrder(order);
        });
      });
    }

    return state;
  }
}
