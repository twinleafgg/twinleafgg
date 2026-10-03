import { Effect } from '../../game/store/effects/effect';
import { GameError } from '../../game/game-error';
import { GameMessage } from '../../game/game-message';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { StateUtils } from '../../game/store/state-utils';
import { UseStadiumEffect } from '../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';
import { ChooseCardsPrompt } from '../../game/store/prompts/choose-cards-prompt';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class ChampionshipArena extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'NP';
  public name: string = 'Championship Arena';
  public fullName: string = 'Championship Arena NP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '28';

  public text: string =
    "At the end of each player's turn, if that player has 8 or more cards in his or her hand, that player discards a number of cards until the player has 7 cards left in his or her hand.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      if (player.hand.cards.length >= 8) {
        const discardAmount = player.hand.cards.length - 7;

        state = store.prompt(
          state,
          new ChooseCardsPrompt(
            effect.player,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            player.hand,
            {},
            { allowCancel: false, min: discardAmount, max: discardAmount },
          ),
          (cards) => {
            cards = cards || [];
            if (cards.length === 0) {
              return;
            }
            MOVE_CARDS(store, state, player.hand, player.discard, {
              cards: cards,
              sourceCard: this,
            });
          },
        );
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
