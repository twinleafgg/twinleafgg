import { Effect } from '../../../game/store/effects/effect';
import { GamePhase, State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import {
  HAS_MARKER,
  REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN,
  SHUFFLE_HAND_INTO_DECK_THEN_DRAW,
} from '../../../game/store/prefabs/prefabs';

export class Bruno extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public regulationMark = 'E';

  public set: string = 'BST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '121';

  public name: string = 'Bruno';

  public fullName: string = 'Bruno BST';

  public text: string =
    "Shuffle your hand into your deck. Then, draw 4 cards. If any of your Pokémon were Knocked Out during your opponent's last turn, draw 7 cards instead.";

  public readonly BRUNO_MARKER = 'BRUNO_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof KnockOutEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const duringTurn = [GamePhase.PLAYER_TURN, GamePhase.ATTACK].includes(state.phase);

      if (!duringTurn || state.players[state.activePlayer] !== opponent) return state;

      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner === player) effect.player.marker.addMarker(this.BRUNO_MARKER, this);

      return state;
    }

    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const cardsToDraw = HAS_MARKER(this.BRUNO_MARKER, player, this) ? 7 : 4;

      return SHUFFLE_HAND_INTO_DECK_THEN_DRAW(store, state, player, {
        excludeCard: this,
        drawCount: cardsToDraw,
      });
    }

    REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN(effect, this.BRUNO_MARKER, this);

    return state;
  }
}
