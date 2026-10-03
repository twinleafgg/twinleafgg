import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { Player } from '../../../game/store/state/player';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameError, GameMessage, StateUtils } from '../../..';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class XerosicsScheme extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public regulationMark = 'H';

  public set: string = 'SFA';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '64';

  public name: string = "Xerosic's Machinations";

  public fullName: string = "Xerosic's Machinations SFA";

  public text: string =
    'Your opponent discards cards from their hand until they have 3 cards in their hand.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    const opponent = StateUtils.getOpponent(state, player);
    if (opponent.hand.cards.length <= 3) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      // Get opponent's hand length
      const opponentHandLength = opponent.hand.cards.length;

      if (opponentHandLength <= 3) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Set discard amount to reach hand size of 3
      const discardAmount = opponentHandLength - 3;

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      // Opponent discards first
      store.prompt(
        state,
        new ChooseCardsPrompt(
          opponent,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.hand,
          {},
          { min: discardAmount, max: discardAmount, allowCancel: false },
        ),
        (selected) => {
          const cards = selected || [];
          MOVE_CARDS(store, state, opponent.hand, opponent.discard, {
            cards: cards,
            sourceCard: this,
          });
        },
      );
    }
    return state;
  }
}
