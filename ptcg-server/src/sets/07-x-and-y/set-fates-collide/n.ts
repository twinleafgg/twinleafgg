import { GameError, GameMessage, ShuffleDeckPrompt } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { MoveCardsEffect } from '../../../game/store/effects/game-effects';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class N extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'FCO';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '105';

  public name: string = 'N';

  public fullName: string = 'N FCO';

  public text: string =
    'Each player shuffles his or her hand into his or her deck. Then, each player draws a card for each of his or her remaining Prize cards.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const cards = player.hand.cards.filter((c) => c !== this);

      if (cards.length === 0 && player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const playerMoveEffect = new MoveCardsEffect(player.hand, player.deck, {
        cards,
        sourceCard: this,
      });
      state = store.reduceEffect(state, playerMoveEffect);

      const opponentMoveEffect = new MoveCardsEffect(opponent.hand, opponent.deck, {
        sourceCard: this,
      });
      state = store.reduceEffect(state, opponentMoveEffect);

      // opponent shuffle and draw
      if (!opponentMoveEffect.preventDefault) {
        store.prompt(state, new ShuffleDeckPrompt(opponent.id), (order) => {
          opponent.deck.applyOrder(order);
        });
        MOVE_CARDS(store, state, opponent.deck, opponent.hand, {
          count: Math.min(opponent.getPrizeLeft(), opponent.deck.cards.length),
          sourceCard: this,
        });
      }

      // player shuffle and draw
      store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
      });
      MOVE_CARDS(store, state, player.deck, player.hand, {
        count: Math.min(player.getPrizeLeft(), player.deck.cards.length),
        sourceCard: this,
      });
    }

    return state;
  }
}
