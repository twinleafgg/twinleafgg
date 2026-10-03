import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { StateUtils, StoreLike, State, Player } from '../../../game';
import { GameError, GameMessage } from '../../../game';
import { CardList } from '../../../game/store/state/card-list';
import {DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class SpecialRedCard extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '82';
  public name: string = 'Special Red Card';
  public fullName: string = 'Special Red Card M4';
  public text: string =
    'You can use this card only if your opponent has 3 or fewer Prize cards remaining.\n\n' +
    'Your opponent shuffles their hand and puts it on the bottom of their deck. If they put any cards on the bottom of their deck in this way, they draw 3 cards.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const opponent = StateUtils.getOpponent(state, player);
    const prizeCount = opponent.prizes.filter((p) => p.cards.length > 0).length;
    if (prizeCount > 3) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const prizeCount = opponent.prizes.filter((p) => p.cards.length > 0).length;
      if (prizeCount > 3) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
      const cardsInHand = opponent.hand.cards.length;
      if (cardsInHand > 0) {
        const deckBottom = new CardList();
        MOVE_CARDS(store, state, opponent.hand, deckBottom, { sourceCard: this });
        MOVE_CARDS(store, state, deckBottom, opponent.deck, { sourceCard: this });
        DRAW_CARDS(store, state, opponent, Math.min(3, opponent.deck.cards.length));
      }
    }
    return state;
  }
}
