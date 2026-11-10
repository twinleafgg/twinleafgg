import type { CubeDraftRoom } from './types';

export const CUBE_DRAFT_CHANNEL = 'twinleaf-cube-draft';

export type CubeWireMessage =
  | { kind: 'hello'; roomCode: string; clientId: string; name: string; userId: number | null }
  | { kind: 'heartbeat'; roomCode: string; clientId: string; now: number }
  | { kind: 'ready'; roomCode: string; clientId: string; ready: boolean }
  | { kind: 'pick'; roomCode: string; clientId: string; cardFullName: string }
  | { kind: 'start'; roomCode: string; clientId: string }
  | { kind: 'goodbye'; roomCode: string; clientId: string }
  | { kind: 'state'; roomCode: string; state: CubeDraftRoom }
  | { kind: 'notice'; roomCode: string; targetClientId: string; message: string }
  | { kind: 'closed'; roomCode: string; hostId: string };

/**
 * BroadcastChannel transport for same-browser draft rooms. The host tab owns state
 * and broadcasts snapshots; guests send intents. Falls back to a silent no-op when
 * the browser does not support BroadcastChannel.
 */
export class CubeDraftChannel {
  private channel: BroadcastChannel | null = null;

  constructor(private readonly onMessage: (message: CubeWireMessage) => void) {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }
    try {
      this.channel = new BroadcastChannel(CUBE_DRAFT_CHANNEL);
      this.channel.onmessage = (event: MessageEvent<CubeWireMessage>) => {
        const data = event.data;
        if (data && typeof data.kind === 'string' && typeof data.roomCode === 'string') {
          this.onMessage(data);
        }
      };
    } catch {
      this.channel = null;
    }
  }

  get supported(): boolean {
    return this.channel !== null;
  }

  post(message: CubeWireMessage): void {
    try {
      this.channel?.postMessage(message);
    } catch {
      /* closed channel */
    }
  }

  close(): void {
    try {
      this.channel?.close();
    } catch {
      /* ignore */
    }
    this.channel = null;
  }
}
