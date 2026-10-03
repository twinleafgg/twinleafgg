import { StateUtils } from '../../../game/store/state-utils';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { CardList } from '../../../game/store/state/card-list';
import { GameLog, GameMessage, ShowCardsPrompt } from '../../../game';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Pokestop extends TrainerCard {
  public regulationMark = 'F';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '68';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'PGO';
  public name = 'PokéStop';
  public fullName = 'PokéStop PGO';
  public text =
    "Once during each player's turn, that player may discard 3 cards from the top of their deck. If a player discarded any Item cards in this way, they put those Item cards into their hand.";

  reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      return this.useStadium(store, state, effect);
    }
    return state;
  }

  useStadium(store: StoreLike, state: State, effect: UseStadiumEffect): State {
    const player = effect.player;

    const deckTop = new CardList();
    MOVE_CARDS(store, state, player.deck, deckTop, { count: 3, sourceCard: this });

    // Filter for item cards
    const itemCards = deckTop.cards.filter(
      (c) => c instanceof TrainerCard && c.trainerType === TrainerType.ITEM,
    );

    const discards = deckTop.cards.filter((c) => !itemCards.includes(c));

    // Move all cards to discard
    MOVE_CARDS(store, state, deckTop, player.discard, { count: deckTop.cards.length, sourceCard: this });

    itemCards.forEach((card, index) => {
      store.log(state, GameLog.LOG_PLAYER_PUTS_CARD_IN_HAND, {
        name: player.name,
        card: card.name,
      });
    });

    discards.forEach((card, index) => {
      store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, {
        name: player.name,
        card: card.name,
        effectName: this.name,
      });
    });

    // Move item cards to hand
    MOVE_CARDS(store, state, player.discard, player.hand, { cards: itemCards, sourceCard: this });

    if (itemCards.length > 0) {
      const opponent = StateUtils.getOpponent(state, player);
      return store.prompt(
        state,
        new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, itemCards),
        () => {},
      );
    }

    return state;
  }
}
