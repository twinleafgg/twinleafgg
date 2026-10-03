import { StoreLike, State, GameError, GameMessage, StateUtils } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class StevensAdvice extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'PK';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  public name: string = "Steven's Advice";
  public fullName: string = "Steven's Advice PK";
  public text =
    "Draw a number of cards up to the number of your opponent's Pokémon in play. If you have 7 or more cards (including this one) in your hand, you can't play this card.";
  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const playerHand = player.hand.cards.filter((c) => c !== this);

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (playerHand.length + 1 >= 7) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const opponentBenched = opponent.bench.reduce(
        (left, b) => left + (b.cards.length ? 1 : 0),
        0,
      );
      const totalOpponentPokemon = opponentBenched + 1;

      MOVE_CARDS(store, state, player.deck, player.hand, { count: Math.min(totalOpponentPokemon, player.deck.cards.length), sourceCard: this });
    }

    return state;
  }
}
