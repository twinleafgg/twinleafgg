import { GameError } from '../game-error';
import { GameLog, GameMessage } from '../game-message';
import { Card } from './card/card';
import { CardTag } from './card/card-types';
import { TrainerCard } from './card/trainer-card';
import { REMOVE_STADIUM_CARD_LIST } from './stadium-utils';
import { Player } from './state/player';
import { GamePhase, State } from './state/state';
import { StateUtils } from './state-utils';
import { StoreLike } from './store-like';

export function isDualStadiumCard(card: Card): card is TrainerCard {
  return card instanceof TrainerCard && card.tags.includes(CardTag.DUAL_STADIUM);
}

/** Both distinct halves of the same dual stadium must be in hand. */
export function getDualStadiumHalvesInHand(player: Player, card: TrainerCard): Card[] {
  const halves = player.hand.cards.filter(
    (c: Card) => c.name === card.name && c.tags.includes(CardTag.DUAL_STADIUM),
  );
  const bySetNumber = new Map<string, Card>();
  for (const half of halves) {
    if (!bySetNumber.has(half.setNumber)) {
      bySetNumber.set(half.setNumber, half);
    }
  }
  return [...bySetNumber.values()].sort((a, b) => Number(a.setNumber) - Number(b.setNumber));
}

export function hasBothDualStadiumHalvesInHand(player: Player, card: TrainerCard): boolean {
  return getDualStadiumHalvesInHand(player, card).length >= 2;
}

export function canPlayDualStadium(
  store: StoreLike,
  state: State,
  player: Player,
  card: TrainerCard,
): boolean {
  if (
    state.phase !== GamePhase.PLAYER_TURN ||
    state.players[state.activePlayer]?.id !== player.id
  ) {
    return false;
  }
  if (!hasBothDualStadiumHalvesInHand(player, card)) {
    return false;
  }
  if (state.rules.oneStadiumPerTurn && player.stadiumPlayedTurn === state.turn) {
    return false;
  }
  const stadium = StateUtils.getStadiumCard(state);
  if (!state.rules.allowSameNameStadium && stadium && stadium.name === card.name) {
    return false;
  }
  return true;
}

export function assembleDualStadiumFromHand(
  store: StoreLike,
  state: State,
  player: Player,
  triggeredCard: TrainerCard,
): State {
  const halves = getDualStadiumHalvesInHand(player, triggeredCard);
  if (halves.length < 2) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  if (state.rules.oneStadiumPerTurn && player.stadiumPlayedTurn === state.turn) {
    throw new GameError(GameMessage.STADIUM_ALREADY_PLAYED);
  }

  const stadium = StateUtils.getStadiumCard(state);
  if (!state.rules.allowSameNameStadium && stadium && stadium.name === triggeredCard.name) {
    throw new GameError(GameMessage.SAME_STADIUM_ALREADY_IN_PLAY);
  }

  const opponent = StateUtils.getOpponent(state, player);

  if (player.stadium.cards.length > 0) {
    REMOVE_STADIUM_CARD_LIST(player.stadium, player);
  }
  if (opponent.stadium.cards.length > 0) {
    REMOVE_STADIUM_CARD_LIST(opponent.stadium, opponent);
  }

  player.stadiumPlayedTurn = state.turn;
  player.stadiumUsedTurn = 0;
  player.hand.moveCardTo(halves[0], player.stadium);
  player.hand.moveCardTo(halves[1], player.stadium);

  store.log(state, GameLog.LOG_PLAYER_PLAYS_STADIUM, {
    name: player.name,
    card: triggeredCard.name,
  });

  return state;
}
