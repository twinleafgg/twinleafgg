/** Default curated cube size (8 players × 45 cards). */
export const CUBE_TARGET_SIZE = 360;
/** Allowed cube target sizes in the editor. */
export const CUBE_TARGET_SIZE_OPTIONS = [360, 480] as const;
export type CubeTargetSize = (typeof CUBE_TARGET_SIZE_OPTIONS)[number];

export const CUBE_PACK_SIZE = 15;
export const CUBE_PACKS_PER_PLAYER = 3;
export const CUBE_MIN_PLAYERS = 2;
export const CUBE_MAX_PLAYERS = 8;
/** Max copies of a single printing allowed in a cube (or starting-card list). */
export const CUBE_MAX_COPIES = 4;

/** A seat that has not sent a heartbeat for this long is shown as disconnected. */
export const CUBE_SEAT_STALE_MS = 30_000;
/** A guest takes over hosting when the host heartbeat is older than this. */
export const CUBE_HOST_STALE_MS = 20_000;

export interface CubeDefinition {
  id: string;
  name: string;
  /**
   * Card `fullName` multiset for the draft pool. Duplicates are allowed
   * (up to {@link CUBE_MAX_COPIES} of the same printing).
   */
  cards: string[];
  /** Target size shown in the editor / list progress UI. */
  targetSize: number;
  /**
   * Cards every player starts with. Shown in the draft UI but not part of
   * picks or pack dealing; merged into the saved deck after the draft.
   */
  startingCards: string[];
  /** When true, Mutant Evolution house rules apply for games from this cube. */
  mutantEvolution: boolean;
  ownerUserId: number | null;
  ownerName: string;
  createdAt: number;
  updatedAt: number;
}

export type CubeDraftPhase = 'lobby' | 'drafting' | 'complete';

export interface CubeDraftSeat {
  clientId: string;
  name: string;
  userId: number | null;
  ready: boolean;
  connected: boolean;
  lastSeen: number;
  /** Cards picked so far, in pick order. */
  picks: string[];
}

export interface CubeDraftPickLogEntry {
  round: number;
  pick: number;
  clientId: string;
  playerName: string;
  cardFullName: string;
  at: number;
}

export interface CubeDraftRoom {
  /** Six-character join code, also used as the URL id. */
  id: string;
  cubeId: string;
  cubeName: string;
  /** Snapshot of cube starting cards at room creation. */
  startingCards: string[];
  /** Snapshot of cube Mutant Evolution flag at room creation. */
  mutantEvolution: boolean;
  hostId: string;
  hostHeartbeat: number;
  phase: CubeDraftPhase;
  seats: CubeDraftSeat[];
  /** Every pack generated for this draft, round-major. Kept host-side for later rounds. */
  packs: string[][];
  /** The pack currently in front of each seat. */
  packsBySeat: Record<string, string[]>;
  /** 1-based round (1–3). */
  round: number;
  /** Completed passes in the current round (0–15). */
  pickInRound: number;
  /** Whether each seat has picked from its current pack. */
  pickedThisPass: Record<string, boolean>;
  log: CubeDraftPickLogEntry[];
  cardCount: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export function normalizeCubeTargetSize(value: unknown): number {
  if (value === 480) {
    return 480;
  }
  return CUBE_TARGET_SIZE;
}

/** Fill missing fields on cubes loaded from older localStorage payloads. */
export function normalizeCubeDefinition(raw: Partial<CubeDefinition> & { id: string }): CubeDefinition {
  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : 'Untitled cube',
    cards: Array.isArray(raw.cards) ? raw.cards.filter((c): c is string => typeof c === 'string') : [],
    targetSize: normalizeCubeTargetSize(raw.targetSize),
    startingCards: Array.isArray(raw.startingCards)
      ? raw.startingCards.filter((c): c is string => typeof c === 'string')
      : [],
    mutantEvolution: Boolean(raw.mutantEvolution),
    ownerUserId: raw.ownerUserId ?? null,
    ownerName: typeof raw.ownerName === 'string' ? raw.ownerName : '',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}
