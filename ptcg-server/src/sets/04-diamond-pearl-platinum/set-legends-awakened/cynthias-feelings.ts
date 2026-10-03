import { Effect } from '../../../game/store/effects/effect';
import { GamePhase, State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import {
  DRAW_CARDS,
  HAS_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  MOVE_CARDS,
  SHUFFLE_DECK,
} from '../../../game/store/prefabs/prefabs';

export class CynthiasFeelings extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '131';
  public name: string = "Cynthia's Feelings";
  public fullName: string = "Cynthia's Feelings LA";

  public text: string =
    "Shuffle your hand into your deck. Then, draw 4 cards. If any of your Pokémon were Knocked Out during your opponent's last turn, draw 4 more cards.";

  public readonly FEELINGS_MARKER = 'FEELINGS_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof KnockOutEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const duringTurn = [GamePhase.PLAYER_TURN, GamePhase.ATTACK].includes(state.phase);

      // Do not activate between turns, or when it's not opponents turn.
      if (!duringTurn || state.players[state.activePlayer] !== opponent) return state;

      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner === player) effect.player.marker.addMarker(this.FEELINGS_MARKER, this);

      return state;
    }

    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      let cardsToDraw = 4;
      if (HAS_MARKER(this.FEELINGS_MARKER, player, this)) cardsToDraw = 8;

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      MOVE_CARDS(store, state, player.hand, player.deck, {
        cards: player.hand.cards.filter((c) => c !== this),
      });
      SHUFFLE_DECK(store, state, player);
      DRAW_CARDS(store, state, player, cardsToDraw);
      MOVE_CARDS(store, state, player.supporter, player.discard, { cards: [this], sourceCard: this });
    }
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.FEELINGS_MARKER, this);

    return state;
  }
}
