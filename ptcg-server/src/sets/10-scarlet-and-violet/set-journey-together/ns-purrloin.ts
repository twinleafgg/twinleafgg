import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, Card, GameMessage, ChooseCardsPrompt } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class NsPurrloin extends PokemonCard {
  protected _tags = [CardTag.NS];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.DARK];
  public hp: number = 70;
  public weakness = [{ type: CardType.GRASS }];
  public retreat = [CardType.COLORLESS];

  public attacks = [
    {
      name: 'Pilfer',
      cost: [CardType.DARK, CardType.COLORLESS],
      damage: 30,
      text: 'Your opponent reveals their hand. Put a card you find there on the bottom of their deck.',
    },
  ];

  public set: string = 'JTG';
  public regulationMark = 'I';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '96';
  public name: string = "N's Purrloin";
  public fullName: string = "N's Purrloin JTG";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Opponent has no cards in the hand
      if (opponent.hand.cards.length === 0) {
        return state;
      }

      let cards: Card[] = [];
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          opponent.hand,
          {},
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];
          MOVE_CARDS(store, state, opponent.hand, opponent.deck, { cards: cards, sourceCard: this });
        },
      );
    }

    return state;
  }
}
