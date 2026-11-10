import {
  GameInfo, GameState, ClientInfo, UserInfo, StateLog, ServerConfig,
  Replay, State, ConversationInfo, Card
} from 'ptcg-server';
import { Observable } from 'rxjs';

export class Session {
  authToken!: string;
  config!: ServerConfig;
  loggedUserId!: number;
  clientId!: number;
  games: GameInfo[] = [];
  clients: ClientInfo[] = [];
  users: UserInfoMap = {};
  lastGameId!: number;
  gameStates: LocalGameState[] = [];
  conversations: ConversationInfo[] = [];
}

export interface PlayerGameStats {
  prizesTakenCount: number;
  totalDamageDealt: number;
  topPokemon: {
    card: Card;
    totalDamage: number;
  } | null;
}

export interface EnhancedPokemonStats {
  card: Card;
  totalDamage: number;
  evolutionLevel: number;
}

export interface LocalGameState extends GameState {
  localId: number;
  deleted: boolean;
  gameOver: boolean;
  switchSide: boolean;
  promptMinimized: boolean;
  state: State;
  logs: StateLog[];
  replayPosition: number;
  replay?: Replay;
  /** Set when opened from match history / spectate replay. */
  matchId?: number;
  /** Set when opened from saved replays. */
  replayId?: number;
  enhancedPlayerStats?: PlayerGameStats[];
  /** Last full serialized state for applying live diffs. */
  serializedBase?: string;
  /** Sanitized view key from the server (`p123`, `spec`, …). */
  viewKey?: string;
}

export interface UserInfoMap {
  [userId: number]: UserInfo;
}

export interface SessionGetters {
  get<T>(selector: (session: Session) => T): Observable<T>;
  get<T, R>(s1: (session: Session) => T, s2: (session: Session) => R): Observable<[T, R]>;
  get<T, R, S>(s1: (session: Session) => T, s2: (session: Session) => R, s3: (session: Session) => S): Observable<[T, R, S]>;
}
