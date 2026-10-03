import { ShuffleDeckPrompt } from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameLog, GameMessage } from '../../../game/game-message';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class JubilifeVillage extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;

  public set: string = 'ASR';

  public regulationMark = 'F';

  public name: string = 'Jubilife Village';

  public cardImage: string = 'assets/cardback.png';

  public fullName: string = 'Jubilife Village ASR';

  public setNumber: string = '148';

  public text: string =
    "Once during each player's turn, that player may shuffle their hand into their deck and draw 5 cards. If they do, their turn ends.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0 && player.hand.cards.length == 0) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      const cards = player.hand.cards.filter((c) => c !== this);
      MOVE_CARDS(store, state, player.hand, player.deck, { cards, sourceCard: this });

      state = store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
      });

      DRAW_CARDS(store, state, player, 5);

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
