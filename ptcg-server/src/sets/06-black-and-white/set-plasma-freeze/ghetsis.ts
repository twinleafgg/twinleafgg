import { GameError, GameMessage, StateUtils } from '../../../game';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  DRAW_CARDS,
  MOVE_CARDS,
  SHOW_CARDS_TO_PLAYER,
  SHUFFLE_DECK,
} from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class Ghetsis extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  protected _tags = [CardTag.TEAM_PLASMA];
  public set: string = 'PLF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '101';
  public name: string = 'Ghetsis';
  public fullName: string = 'Ghetsis PLF';

  public text: string =
    'Your opponent reveals his or her hand and shuffles all Item cards found there into his or her deck. Then, draw a number of cards equal to the number of Item cards your opponent shuffled into his or her deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      // Create a temporary copy of the opponent's hand to show
      const opponentHandSnapshot = [...opponent.hand.cards];
      SHOW_CARDS_TO_PLAYER(store, state, player, opponentHandSnapshot);

      // Find Item cards in the opponent's hand
      const itemsShown = opponent.hand.cards.filter(
        (card) => card instanceof TrainerCard && card.trainerType === TrainerType.ITEM,
      );

      // Move Item cards to deck and shuffle
      MOVE_CARDS(store, state, opponent.hand, opponent.deck, { cards: itemsShown });
      SHUFFLE_DECK(store, state, opponent);

      // Draw cards equal to the number of Item cards shuffled
      DRAW_CARDS(store, state, player, itemsShown.length);

      return state;
    }

    return state;
  }
}
