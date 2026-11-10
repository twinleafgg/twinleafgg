import { gzip, ungzip } from '@progress/pako-esm';
import { Format } from '../store/card/card-types';
import { State } from '../store/state/state';
import { StateSerializer } from '../serializer/state-serializer';
import { GameError } from '../game-error';
import { GameCoreError } from '../game-message';

export const SNAPSHOT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
export const SNAPSHOT_CODE_LENGTH = 8;

export interface GameSnapshotPayload {
  version: 1;
  created: number;
  format: Format;
  turn: number;
  player1Name: string;
  player2Name: string;
  stateData: string;
}

export function buildSnapshotPayload(state: State): GameSnapshotPayload {
  const serializer = new StateSerializer();
  return {
    version: 1,
    created: Date.now(),
    format: state.gameSettings?.format ?? Format.STANDARD,
    turn: state.turn,
    player1Name: state.players[0]?.name ?? '',
    player2Name: state.players[1]?.name ?? '',
    stateData: serializer.serialize(state),
  };
}

export function compressSnapshotPayload(payload: GameSnapshotPayload): string {
  return gzip(JSON.stringify(payload), { to: 'string' });
}

export function decompressSnapshotPayload(data: string): GameSnapshotPayload {
  try {
    const json = ungzip(data, { to: 'string' });
    const parsed = JSON.parse(json) as GameSnapshotPayload;
    if (!parsed || parsed.version !== 1 || typeof parsed.stateData !== 'string') {
      throw new Error('invalid');
    }
    return parsed;
  } catch {
    throw new GameError(GameCoreError.ERROR_SNAPSHOT_INVALID);
  }
}

export function generateSnapshotCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < SNAPSHOT_CODE_LENGTH; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function deserializeSnapshotState(payload: GameSnapshotPayload): State {
  const serializer = new StateSerializer();
  try {
    return serializer.deserialize(payload.stateData);
  } catch {
    throw new GameError(GameCoreError.ERROR_SNAPSHOT_INVALID);
  }
}
