import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ShowCardsPrompt } from '../../../game/store/prompts/show-cards-prompt';
import { GameError } from '../../../game';
import {DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class AcerolasPremonition extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public regulationMark = 'E';

  public set: string = 'BRS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '129';

  public name: string = "Acerola's Premonition";

  public fullName: string = "Acerola's Premonition BRS";

  public text: string =
    'Your opponent reveals their hand, and you draw a card for each Trainer card you find there.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const cardsInOpponentHand = opponent.hand.cards.filter((card) => card instanceof TrainerCard);

      state = store.prompt(
        state,
        new ShowCardsPrompt(
          player.id,
          GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
          opponent.hand.cards,
        ),
        () => {
          const cardsToMove = cardsInOpponentHand.length;
          DRAW_CARDS(store, state, player, cardsToMove);
        },
      );
    }
    return state;
  }
}
