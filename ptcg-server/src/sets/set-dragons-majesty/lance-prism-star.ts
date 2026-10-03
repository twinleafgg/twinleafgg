import { GameError, GameMessage, StateUtils } from '../../game';
import { CardTag, CardType, TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Effect } from '../../game/store/effects/effect';
import { KnockOutEffect } from '../../game/store/effects/game-effects';
import {ADD_MARKER,
  REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN,
  SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH, MOVE_CARDS } from '../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { GamePhase, State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';

export class LancePrismStar extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  protected _tags = [CardTag.PRISM_STAR];
  public set: string = 'DRM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '61';
  public name: string = 'Lance Prism Star';
  public fullName: string = 'Lance Prism Star DRM';

  public text: string =
    "You can play this card only if 1 of your Pokémon was Knocked Out during your opponent's last turn.\n\nSearch your deck for up to 2 [N] Pokémon and put them onto your Bench. Then, shuffle your deck.";

  public readonly LANCE_MARKER = 'LANCE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      // No Pokemon KO last turn
      if (!player.marker.hasMarker(this.LANCE_MARKER)) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });

      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH(
        store,
        state,
        player,
        { cardType: [CardType.DRAGON] },
        { min: 0, max: 2, allowCancel: false },
      );

      MOVE_CARDS(store, state, player.supporter, player.lostzone, { cards: [this], sourceCard: this });
    }

    if (effect instanceof KnockOutEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const duringTurn = [GamePhase.PLAYER_TURN, GamePhase.ATTACK].includes(state.phase);

      // Do not activate between turns, or when it's not opponents turn.
      if (!duringTurn || state.players[state.activePlayer] !== opponent) {
        return state;
      }

      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner === player) {
        ADD_MARKER(this.LANCE_MARKER, player, this);
      }
      return state;
    }

    REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN(effect, this.LANCE_MARKER, this);

    return state;
  }
}
