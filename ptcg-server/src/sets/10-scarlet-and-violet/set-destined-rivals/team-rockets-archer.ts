import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { Player } from '../../../game/store/state/player';
import { GamePhase, State } from '../../../game/store/state/state';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { KnockOutEffect, MoveCardsEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {DRAW_CARDS,
  REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN,
  SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TeamRocketsArcher extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  protected _tags = [CardTag.TEAM_ROCKET];
  public regulationMark = 'I';
  public set: string = 'DRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '170';
  public name: string = "Team Rocket's Archer";
  public fullName: string = "Team Rocket's Archer DRI";

  public text: string =
    "You can use this card only if any of your Team Rocket's Pokemon were Knocked Out during your opponent's last turn.\n\n" +
    'Each player shuffles their hand into their deck. Then, you draw 5 cards, and your opponent draws 3 cards.';

  public readonly ARCHER_MARKER = 'ARCHER_MARKER';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Handle playing the card
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Verify a Team Rocket's Pokemon was knocked out during opponent's last turn
      if (!player.marker.hasMarker(this.ARCHER_MARKER)) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      player.rocketSupporter = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const cards = player.hand.cards.filter((c) => c !== this);

      const playerMoveEffect = new MoveCardsEffect(player.hand, player.deck, {
        cards,
        sourceCard: this,
      });
      state = store.reduceEffect(state, playerMoveEffect);

      const opponentMoveEffect = new MoveCardsEffect(opponent.hand, opponent.deck, {
        sourceCard: this,
      });
      state = store.reduceEffect(state, opponentMoveEffect);

      // opponent shuffle and draw
      if (!opponentMoveEffect.preventDefault) {
        SHUFFLE_DECK(store, state, opponent);
        DRAW_CARDS(store, state, opponent, 3);
      }

      // player shuffle and draw
      SHUFFLE_DECK(store, state, player);
      DRAW_CARDS(store, state, player, 5);
    }

    // Track when a Team Rocket's Pokemon is knocked out
    if (effect instanceof KnockOutEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const duringTurn = [GamePhase.PLAYER_TURN, GamePhase.ATTACK].includes(state.phase);

      // Do not activate between turns, or when it's not opponents turn
      if (!duringTurn || state.players[state.activePlayer] !== opponent) {
        return state;
      }

      // Check if knocked out Pokemon was a Team Rocket's Pokemon
      const knockedOutPokemon = effect.target.getPokemonCard();
      if (knockedOutPokemon && knockedOutPokemon.hasTag(CardTag.TEAM_ROCKET)) {
        effect.player.marker.addMarker(this.ARCHER_MARKER, this);
      }

      return state;
    }

    // Reset marker at end of turn
    REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN(effect, this.ARCHER_MARKER, this);

    if (effect instanceof EndTurnEffect && effect.player.rocketSupporter) {
      effect.player.rocketSupporter = false;
    }

    return state;
  }
}
