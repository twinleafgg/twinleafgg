import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { CardList, ChooseCardsPrompt } from '../../../game';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class NightTimeAcademy extends TrainerCard {
  public regulationMark = 'H';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '54';

  protected _trainerType = TrainerType.STADIUM;

  public set = 'SFA';

  public name = 'Academy at Night';

  public fullName = 'Academy at Night SFA';

  public text =
    "Once during each player's turn, that player may put a card from their hand on top of their deck.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0 || player.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const deckTop = new CardList();

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          player.hand,
          {},
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          const cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.hand, deckTop, { cards: cards, sourceCard: this });
          }
          deckTop.moveToTopOfDestination(player.deck);
        },
      );
    }
    return state;
  }
}
