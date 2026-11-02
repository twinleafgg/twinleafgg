import { TrainerCard, TrainerType, StoreLike, State, Player, GameError, GameMessage } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { TrainerEffect } from "../../../game/store/effects/play-card-effects";
import { GET_PRIZES_AS_CARD_ARRAY, GET_PLAYER_PRIZES, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class RedeemableTicket extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public regulationMark = 'I';
  public set: string = 'JTG';
  public name: string = 'Redeemable Ticket';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '156';
  public fullName: string = 'Redeemable Ticket JTG';
  public text: string = 'Count your Prize cards, shuffle them, and put them on the bottom of your deck. Then, take that many cards from the top of your deck and put them face down as your Prize cards.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return player.getPrizeLeft() > 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (!(effect instanceof TrainerEffect && effect.trainerCard === this)) {
      return state;
    }

    const player = effect.player;
    const prizeCards = GET_PRIZES_AS_CARD_ARRAY(player);
    const prizeCount = prizeCards.length;

    if (prizeCount === 0) {
      throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
    }

    // Count your Prize cards, shuffle them, and put them on the bottom of your deck.
    // The deck array's front is its top, so the bottom is the end of the array.
    this.shuffleArray(prizeCards);
    GET_PLAYER_PRIZES(player).forEach((prize) => (prize.cards = []));
    player.deck.cards.push(...prizeCards);

    // Then, take that many cards from the top of your deck as face down Prize cards.
    for (let taken = 0; taken < prizeCount; taken++) {
      const prize = player.prizes.find((p) => p.cards.length === 0);
      if (!prize || player.deck.cards.length === 0) {
        break;
      }
      state = MOVE_CARDS(store, state, player.deck, prize, { count: 1, sourceCard: this });
      prize.isSecret = true;
    }

    return state;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
