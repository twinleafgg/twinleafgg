import { AlertPrompt } from '../../game/store/prompts/alert-prompt';
import { Card } from '../../game/store/card/card';
import { CardList } from '../../game/store/state/card-list';
import { ChooseCardsPrompt } from '../../game/store/prompts/choose-cards-prompt';
import { Client } from '../../game/client/client.interface';
import { GameMessage } from '../../game/game-message';
import { promptRequiresSelfPlayFocus } from '../../game/core/self-play-focus';
import { SocketCache } from './socket-cache';
import { State } from '../../game/store/state/state';
import { SuperType } from '../../game/store/card/card-types';
import { deepClone } from '../../utils';

export interface SanitizeViewer {
  playerId: number;
  roleId: number;
}

export interface SanitizeOptions {
  trimLogs?: boolean;
  lastLogId?: number;
  onLogsTrimmed?: (lastLogId: number) => void;
  /**
   * Self-play has one client for both seats. Keep silent opponent prompts
   * (animation waits) so that client can resolve them without a seat swap.
   */
  selfPlay?: boolean;
}

export class StateSanitizer {

  constructor(
    private client: Client,
    private cache: SocketCache
  ) { }

  public sanitize(state: State, gameId: number, viewingAsPlayerId?: number): State {
    const pid = viewingAsPlayerId !== undefined ? viewingAsPlayerId : this.client.id;
    return StateSanitizer.sanitizeForViewer(state, {
      playerId: pid,
      roleId: this.client.user.roleId,
    }, {
      trimLogs: true,
      lastLogId: this.cache.lastLogIdCache[gameId] || 0,
      onLogsTrimmed: (lastLogId) => {
        this.cache.lastLogIdCache[gameId] = lastLogId;
      },
    });
  }

  public static sanitizeForViewer(
    state: State,
    viewer: SanitizeViewer,
    options: SanitizeOptions = {}
  ): State {
    let next = deepClone(state, [Card]);
    next = filterPrompts(next, viewer.playerId, options.selfPlay === true);
    if (options.trimLogs) {
      next = removeLogs(next, options.lastLogId || 0, options.onLogsTrimmed);
    }
    next = hideSecretCards(next, viewer);
    return next;
  }
}

function hideSecretCards(state: State, viewer: SanitizeViewer): State {
  if (state.cardNames.length === 0) {
    return state;
  }
  getSecretCardLists(state, viewer).forEach(cardList => {
    cardList.cards = cardList.cards.map((c, i) => createUnknownCard(i));
  });
  return state;
}

function createUnknownCard(index: number): Card {
  return {
    superType: SuperType.NONE,
    fullName: 'Unknown',
    name: 'Unknown',
    id: index,
    cardImage: '',
    set: '',
    setNumber: ''
  } as any;
}

function getSecretCardLists(state: State, viewer: SanitizeViewer): CardList[] {
  const sandboxRevealDecks =
    state.gameSettings?.sandboxMode === true && viewer.roleId === 4;
  const players = state.players.filter(p => p.id === viewer.playerId);
  const cardLists: CardList[] = [];
  players.forEach(player => {
    if (player.deck.isSecret && !sandboxRevealDecks) {
      cardLists.push(player.deck);
    }
    player.prizes.forEach(prize => {
      if (prize.isSecret) {
        cardLists.push(prize);
      }
    });
  });

  const opponents = state.players.filter(p => p.id !== viewer.playerId);
  const isPlaying = state.players.some(p => p.id === viewer.playerId);
  const isObserver = !isPlaying;

  opponents.forEach(opponent => {
    if (!opponent.hand.isPublic && (!isObserver || (viewer.roleId !== 4 && viewer.roleId !== 5))) {
      cardLists.push(opponent.hand);
    }
    if (!opponent.deck.isPublic && !sandboxRevealDecks) {
      cardLists.push(opponent.deck);
    }
    const adminObserver = isObserver && viewer.roleId === 4;
    opponent.prizes.forEach(prize => {
      if (!prize.isPublic && !adminObserver) {
        cardLists.push(prize);
      }
    });
  });

  state.prompts.forEach(prompt => {
    if (prompt instanceof ChooseCardsPrompt && prompt.options.isSecret) {
      cardLists.push(prompt.cards);
    }
  });

  return cardLists;
}

function filterPrompts(state: State, viewerPlayerId: number, selfPlay: boolean): State {
  state.prompts = state.prompts.filter(prompt => {
    return prompt.result === undefined;
  });

  state.prompts = state.prompts.map(prompt => {
    if (prompt.playerId !== viewerPlayerId) {
      // Deliver silent gates to the single self-play client without flipping seats.
      if (selfPlay && !promptRequiresSelfPlayFocus(prompt)) {
        return prompt;
      }
      return new AlertPrompt(prompt.playerId, GameMessage.NOT_YOUR_TURN);
    }
    return prompt;
  });

  state.prompts = deepClone(state.prompts, [Card]);
  return state;
}

function removeLogs(
  state: State,
  lastLogId: number,
  onLogsTrimmed?: (lastLogId: number) => void
): State {
  state.logs = state.logs.filter(log => log.id > lastLogId);
  if (state.logs.length > 0 && onLogsTrimmed) {
    onLogsTrimmed(state.logs[state.logs.length - 1].id);
  }
  return state;
}
