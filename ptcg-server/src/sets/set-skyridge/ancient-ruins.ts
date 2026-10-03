import { GameError } from '../../game/game-error';
import { GameMessage } from '../../game/game-message';
import { StateUtils } from '../../game/store/state-utils';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { UseStadiumEffect } from '../../game/store/effects/game-effects';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { Effect } from '../../game/store/effects/effect';
import { DRAW_CARDS, SHOW_CARDS_TO_PLAYER } from '../../game/store/prefabs/prefabs';

export class AncientRuins extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '119';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'SK';
  public name = 'Ancient Ruins';
  public fullName = 'Ancient Ruins SK';

  public text =
    "Once during each player's turn (before he or she attacks), if he or she has not played a Supporter card, that player may reveal his or her hand to his or her opponent. If that player reveals his or her hand and there is no Supporter card there, that player draws a card.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }
      if (
        player.hand.cards.some(
          (c) => c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER,
        )
      ) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      SHOW_CARDS_TO_PLAYER(store, state, opponent, player.hand.cards);
      DRAW_CARDS(store, state, player, 1);
    }

    return state;
  }
}
