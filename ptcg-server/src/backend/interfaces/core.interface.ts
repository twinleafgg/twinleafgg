import { Format, GamePhase } from '../../game';
import { PlayerStats } from '../../game/core/player-stats';
import { Rank } from './rank.enum';


export interface PlayerInfo {
  clientId: number;
  name: string;
  prizes: number;
  deck: number;
}

export interface GameInfo {
  gameId: number;
  phase: GamePhase;
  turn: number;
  activePlayer: number;
  players: PlayerInfo[];
  /** User ids of players in this game (so client can recognize "I am in this game" after reload). */
  playerUserIds?: number[];
  /** Match format for lobby / My Games cards. */
  format?: Format;
  /** True while an Invite player prompt is unresolved in WAITING_FOR_PLAYERS. */
  pendingInvite?: boolean;
  /** Client id of the player who must resolve the invite prompt. */
  inviteeClientId?: number;
}

export interface ClientInfo {
  clientId: number;
  userId: number;
}

export interface CoreInfo {
  clientId: number;
  clients: ClientInfo[];
  users: UserInfo[];
  games: GameInfo[];
  /** When the user has an active disconnected session, the game id they can rejoin. */
  reconnectableGameId?: number;
}

export interface GameState {
  gameId: number;
  stateData: string;
  clientIds: number[];
  timeLimit: number;
  recordingEnabled: boolean;
  playerStats: PlayerStats[];
  format?: Format;
  undoEnabled?: boolean;
  deepUndoEnabled?: boolean;
  canUndo?: boolean;
  undoOwnerId?: number;
}

export interface UserInfo {
  userId: number;
  name: string;
  email: string;
  connected: boolean;
  registered: number;
  lastSeen: number;
  ranking: number;
  rank: Rank;
  lastRankingChange: number;
  avatarFile: string;
  roleId: number;
}

/** True when a game should appear in spectate / active-game lists. */
export function isActiveListGameInfo(game: GameInfo): boolean {
  return game.phase !== GamePhase.FINISHED && game.players.length >= 2;
}
