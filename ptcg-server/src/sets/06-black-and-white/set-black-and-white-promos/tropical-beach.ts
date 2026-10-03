import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage, GameLog } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TropicalBeach extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;

  public set: string = 'BWP';

  public name: string = 'Tropical Beach';

  public fullName: string = 'Tropical Beach BWP';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '28';

  public text: string =
    "Once during each player's turn, that player may draw cards " +
    'until he or she has 7 cards in his or her hand. If he or she does, ' +
    "that player's turn ends.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0 || player.hand.cards.length >= 7) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      const cardsToDraw = 7 - player.hand.cards.length;
      // Use prefab behavior similar to ASR Jubilife Village: draw via helper
      for (let i = 0; i < cardsToDraw; i++) {
        if (player.deck.cards.length > 0) {
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
        }
      }

      // Log the message before turn ends.
      effect.preventDefault = true;
      store.log(state, GameLog.LOG_PLAYER_USES_STADIUM, {
        name: player.name,
        stadium: effect.stadium.name,
      });
      player.stadiumUsedTurn = state.turn;

      const endTurnEffect = new EndTurnEffect(player);
      return store.reduceEffect(state, endTurnEffect);
    }

    return state;
  }
}
