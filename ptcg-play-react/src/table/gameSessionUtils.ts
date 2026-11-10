import type { GameState, State } from 'ptcg-server';
import { Base64, StateSerializer } from 'ptcg-server';
import { extractEnhancedPlayerStatsFromState } from './end-game/playerGameStats';
import type { LocalGameState } from './types/localGameState';

let localIdSeq = 1;
const serializer = new StateSerializer();
const base64Codec = new Base64();

function isDiffPayload(encoded: string): boolean {
  try {
    const parsed = JSON.parse(encoded);
    return Array.isArray(parsed) && parsed.length === 1;
  } catch {
    return false;
  }
}

function isPlausibleGameState(state: unknown): state is State {
  if (!state || typeof state !== 'object') {
    return false;
  }
  const s = state as State;
  if (!Array.isArray(s.players) || s.players.length < 1) {
    return false;
  }
  return s.players.every((p) => {
    return !!p
      && !!p.hand
      && Array.isArray(p.hand.cards)
      && Array.isArray(p.bench)
      && !!p.deck
      && Array.isArray(p.prizes);
  });
}

/**
 * Decode a stateChange payload. Returns null when a diff cannot be applied safely
 * (mismatched/corrupt base) so the caller can keep the previous local state.
 */
export function decodeStateData(
  stateData: string,
  options: { isDiff?: boolean; base?: string } = {},
): { state: State; serializedBase: string } | null {
  const encoded = base64Codec.decode(stateData);
  const looksLikeDiff = isDiffPayload(encoded);
  const treatAsDiff = options.isDiff === true || looksLikeDiff;

  if (treatAsDiff) {
    if (!options.base) {
      return null;
    }
    try {
      const serializedBase = serializer.applyDiff(options.base, encoded);
      const state = serializer.deserialize(serializedBase);
      if (!isPlausibleGameState(state)) {
        return null;
      }
      return { state, serializedBase };
    } catch {
      return null;
    }
  }

  try {
    const state = serializer.deserialize(encoded);
    if (!isPlausibleGameState(state)) {
      return null;
    }
    return { state, serializedBase: encoded };
  } catch {
    return null;
  }
}

export function gameStateToLocal(gs: GameState, replay?: LocalGameState['replay']): LocalGameState {
  const decoded = decodeStateData(gs.stateData);
  if (!decoded) {
    throw new Error('Failed to decode initial game state');
  }
  const { state, serializedBase } = decoded;
  const localId = localIdSeq++;
  const enhancedPlayerStats = extractEnhancedPlayerStatsFromState(state);
  return {
    ...gs,
    localId,
    deleted: !!replay,
    gameOver: !!replay,
    switchSide: false,
    promptMinimized: false,
    state,
    logs: [...state.logs],
    replayPosition: 1,
    replay,
    enhancedPlayerStats,
    serializedBase,
  };
}

export type StateChangeExtras = {
  undoEnabled?: boolean;
  deepUndoEnabled?: boolean;
  canUndo?: boolean;
  undoOwnerId?: number;
};

export function mergeStateChange(
  prev: LocalGameState,
  stateData: string,
  playerStats: import('ptcg-server').PlayerStats[] | undefined,
  isDiff?: boolean,
  viewKey?: string,
  extras?: StateChangeExtras,
): LocalGameState {
  // Diffs are only valid against the same sanitized view (self-play focus / seat).
  if (isDiff && viewKey && prev.viewKey && viewKey !== prev.viewKey) {
    return prev;
  }

  const decoded = decodeStateData(stateData, {
    isDiff: isDiff === true,
    base: prev.serializedBase,
  });

  // Keep last good state until a full snapshot arrives.
  if (!decoded) {
    return prev;
  }

  const { state, serializedBase } = decoded;
  const logs = [...state.logs];
  const enhancedPlayerStats = extractEnhancedPlayerStatsFromState(state);
  return {
    ...prev,
    state,
    logs,
    playerStats: playerStats ?? prev.playerStats,
    enhancedPlayerStats,
    serializedBase,
    viewKey: viewKey ?? prev.viewKey,
    undoEnabled: extras?.undoEnabled ?? prev.undoEnabled,
    deepUndoEnabled: extras?.deepUndoEnabled ?? prev.deepUndoEnabled,
    canUndo: extras?.canUndo ?? prev.canUndo,
    undoOwnerId: extras?.undoOwnerId ?? prev.undoOwnerId,
  };
}
