import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class PrismTower extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'CRI';
  public setNumber: string = '80';
  public name: string = 'Prism Tower';
  public fullName: string = 'Prism Tower M4';
  public cardImage: string = 'assets/cardback.png';

  public text: string =
    "Once during each player's turn, that player may discard 2 cards from their hand in order to draw a card. ";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const stadiumUsedTurn = player.stadiumUsedTurn;

      if (player.stadiumUsedTurn === state.turn) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      if (player.hand.cards.length < 2) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          { allowCancel: false, min: 2, max: 2 },
        ),
        (selected) => {
          selected = selected || [];
          if (selected.length === 0) {
            player.stadiumUsedTurn = stadiumUsedTurn;
            return;
          }
          MOVE_CARDS(store, state, player.hand, player.discard, {
            cards: selected,
            sourceCard: this,
            sourceEffect: this,
          });
          MOVE_CARDS(store, state, player.deck, player.hand, {
            count: 1,
            sourceCard: this,
            sourceEffect: this,
          });
        },
      );
    }

    return state;
  }
}
