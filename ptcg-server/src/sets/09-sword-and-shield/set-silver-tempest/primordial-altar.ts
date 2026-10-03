import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { CardList } from '../../../game/store/state/card-list';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { StateUtils } from '../../..';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { ConfirmCardsPrompt } from '../../../game/store/prompts/confirm-cards-prompt';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class PrimordialAltar extends TrainerCard {
  protected _trainerType = TrainerType.STADIUM;

  public regulationMark = 'F';

  public set = 'SIT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '161';

  public name = 'Primordial Altar';

  public fullName = 'Primordial Altar SIT';

  public text =
    "Once during each player's turn, that player may look at the top card of their deck. They may discard that card.";

  reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      return this.useStadium(store, state, effect);
    }
    return state;
  }

  useStadium(store: StoreLike, state: State, effect: UseStadiumEffect): State {
    const player = effect.player;

    if (player.deck.cards.length === 0) {
      throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
    }

    const deckTop = new CardList();
    MOVE_CARDS(store, state, player.deck, deckTop, { count: 1, sourceCard: this });

    return store.prompt(
      state,
      new ConfirmCardsPrompt(
        player.id,
        GameMessage.TREKKING_SHOES,
        deckTop.cards, // Fix error by changing toArray() to cards
        { allowCancel: true },
      ),
      (yes) => {
        if (yes !== null) {
          if (yes) {
            // Add card to hand
            MOVE_CARDS(store, state, deckTop, player.discard, { sourceCard: this });
          } else {
            // Discard card
            deckTop.moveToTopOfDestination(player.deck);
          }
        }
      },
    );
  }
}
