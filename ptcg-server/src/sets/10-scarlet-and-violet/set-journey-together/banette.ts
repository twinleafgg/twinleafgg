import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Banette extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Shuppet';
  public cardType: CardType[] = [CardType.PSYCHIC];
  public hp: number = 90;
  public weakness = [{ type: CardType.DARK }];
  public resistance = [{ type: CardType.FIGHTING, value: -30 }];
  public retreat = [CardType.COLORLESS];

  public attacks = [
    {
      name: 'Cursed Words',
      cost: [CardType.PSYCHIC],
      damage: 0,
      text: 'Your opponent chooses 3 cards from their hand and shuffles those cards into their deck.'
    },
    {
      name: 'Spooky Shot',
      cost: [CardType.PSYCHIC, CardType.COLORLESS],
      damage: 70,
      text: ''
    }
  ];

  public set: string = 'JTG';
  public regulationMark = 'I';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '60';
  public name: string = 'Banette';
  public fullName: string = 'Banette JTG';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cursed Speech
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.hand.cards.length === 0) {
        return state;
      }

      const cardsToShuffle = Math.min(3, opponent.hand.cards.length);

      state = store.prompt(state, new ChooseCardsPrompt(
        opponent,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        opponent.hand,
        {},
        { allowCancel: false, min: cardsToShuffle, max: cardsToShuffle }
      ), cards => {
        cards = cards || [];
        MOVE_CARDS(store, state, opponent.hand, opponent.deck, { cards: cards, sourceCard: this });
      });

      return store.prompt(state, new ShuffleDeckPrompt(opponent.id), order => {
        opponent.deck.applyOrder(order);
      });
    }

    return state;
  }

}