import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StateUtils } from '../../../game/store/state-utils';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { GameError, GameMessage } from '../../../game';
import { DRAW_CARDS, SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';
import { MoveCardsEffect } from '../../../game/store/effects/game-effects';

export class AceTrainer extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'AOR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '69';
  public name: string = 'Ace Trainer';
  public fullName: string = 'Ace Trainer AOR';
  public text: string =
    'You can play this card only if you have more Prize cards left than your opponent.\n\nEach player shuffles his or her hand into his or her deck. Then, draw 6 cards. Your opponent draws 3 cards.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (player.getPrizeLeft() <= opponent.getPrizeLeft()) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const cards = player.hand.cards.filter((c) => c !== this);

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
        SHUFFLE_DECK(store, state, opponent);
        DRAW_CARDS(store, state, opponent, 3);
      }

      // player shuffle and draw
      SHUFFLE_DECK(store, state, player);
      DRAW_CARDS(store, state, player, 6);
    }

    return state;
  }
}
