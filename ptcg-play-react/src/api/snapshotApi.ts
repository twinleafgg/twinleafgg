import { apiGet, apiPost } from './client';
import type { Format, GameState } from 'ptcg-server';

export interface SnapshotMeta {
  player1Name: string;
  player2Name: string;
  format: Format;
  turn: number;
  created: number;
  expiresAt: number;
}

export interface SnapshotResponse {
  ok: boolean;
  code: string;
  snapshotData: string;
  meta: SnapshotMeta;
}

export interface SnapshotPlayResponse {
  ok: boolean;
  game: GameState;
}

export function createSnapshotFromGame(gameId: number): Promise<SnapshotResponse> {
  return apiPost<SnapshotResponse>('/v1/snapshots/create', { gameId });
}

export function createSnapshotFromMatch(matchId: number, position: number): Promise<SnapshotResponse> {
  return apiPost<SnapshotResponse>('/v1/snapshots/create', { matchId, position });
}

export function createSnapshotFromReplay(replayId: number, position: number): Promise<SnapshotResponse> {
  return apiPost<SnapshotResponse>('/v1/snapshots/create', { replayId, position });
}

export function createSnapshotFromFileData(stateData: string): Promise<SnapshotResponse> {
  return apiPost<SnapshotResponse>('/v1/snapshots/create', { stateData });
}

export function getSnapshot(code: string): Promise<SnapshotResponse> {
  return apiGet<SnapshotResponse>(`/v1/snapshots/${encodeURIComponent(code)}`);
}

export function playSnapshot(params: { code?: string; snapshotData?: string }): Promise<SnapshotPlayResponse> {
  return apiPost<SnapshotPlayResponse>('/v1/snapshots/play', params);
}

export function downloadSnapshotFile(snapshotData: string, code: string): void {
  const blob = new Blob([snapshotData], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `game-${code}.ptcgsnap`;
  a.click();
  URL.revokeObjectURL(url);
}
