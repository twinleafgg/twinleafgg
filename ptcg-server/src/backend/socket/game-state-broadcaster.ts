import { Base64 } from '../../utils';
import { StateSerializer } from '../../game';
import { selfPlayFocusPlayerId } from '../../game/core/self-play-focus';
import { Game } from '../../game/core/game';
import { State } from '../../game/store/state/state';
import { SocketClient } from './socket-client';
import { StateSanitizer, SanitizeViewer } from './state-sanitizer';

export function gameRoom(gameId: number): string {
  return `game:${gameId}`;
}

export function gameViewRoom(gameId: number, viewKey: string): string {
  return `game:${gameId}:view:${viewKey}`;
}

/** Stable view key for sanitize + room membership. */
export function getViewKey(game: Game, viewer: SanitizeViewer, state: State): string {
  if (game.gameSettings.selfPlay === true) {
    return `p${selfPlayFocusPlayerId(state)}`;
  }
  const isPlaying = state.players.some(p => p.id === viewer.playerId);
  if (isPlaying) {
    return `p${viewer.playerId}`;
  }
  if (viewer.roleId === 4) {
    return 'admin4';
  }
  if (viewer.roleId === 5) {
    return 'admin5';
  }
  return 'spec';
}

export function viewerFromSocketClient(client: SocketClient): SanitizeViewer {
  return {
    playerId: client.id,
    roleId: client.user.roleId,
  };
}

interface ViewCacheEntry {
  serialized: string;
  lastActivePlayerId: number | null;
}

/**
 * Shared sanitize + serialize + room fan-out for live games.
 * Computes one payload per viewer role instead of per connected socket.
 */
export class GameStateBroadcaster {
  private static serializer = new StateSerializer();
  private static base64 = new Base64();
  /** gameId → viewKey → last full serialized state (for diffs) */
  private static viewCache = new Map<number, Map<string, ViewCacheEntry>>();

  public static clearGame(gameId: number): void {
    this.viewCache.delete(gameId);
  }

  public static joinRooms(client: SocketClient, game: Game): void {
    const viewKey = getViewKey(game, viewerFromSocketClient(client), game.state);
    client.socket.join(gameRoom(game.id));
    client.socket.join(gameViewRoom(game.id, viewKey));
    client.socket.setMeta('gameView', { gameId: game.id, viewKey });
  }

  public static leaveRooms(client: SocketClient, gameId: number): void {
    const meta = client.socket.getMeta<{ gameId: number; viewKey: string }>('gameView');
    client.socket.leave(gameRoom(gameId));
    if (meta && meta.gameId === gameId) {
      client.socket.leave(gameViewRoom(gameId, meta.viewKey));
      client.socket.deleteMeta('gameView');
    } else {
      // Leave all known view rooms for this game if meta was lost
      for (const key of ['spec', 'admin4', 'admin5']) {
        client.socket.leave(gameViewRoom(gameId, key));
      }
      for (const player of gamePlayersSafe(client, gameId)) {
        client.socket.leave(gameViewRoom(gameId, `p${player}`));
      }
    }
  }

  /** Rebind view room when self-play focus / role seat changes. */
  public static refreshViewRoom(client: SocketClient, game: Game): void {
    const nextKey = getViewKey(game, viewerFromSocketClient(client), game.state);
    const meta = client.socket.getMeta<{ gameId: number; viewKey: string }>('gameView');
    if (meta && meta.gameId === game.id && meta.viewKey === nextKey) {
      return;
    }
    if (meta && meta.gameId === game.id) {
      client.socket.leave(gameViewRoom(game.id, meta.viewKey));
    }
    client.socket.join(gameViewRoom(game.id, nextKey));
    client.socket.setMeta('gameView', { gameId: game.id, viewKey: nextKey });
  }

  public static broadcast(game: Game, state: State, options: { forceFull?: boolean } = {}): void {
    const forceFull = options.forceFull === true;
    const socketClients = game.clients.filter((c): c is SocketClient => isSocketClient(c));
    if (socketClients.length === 0) {
      return;
    }

    const io = socketClients[0].socket.io;
    if (this.viewCache.get(game.id) === undefined) {
      this.viewCache.set(game.id, new Map());
    }
    const cache = this.viewCache.get(game.id)!;

    // View-key switches (esp. self-play focus) must not send diffs against another seat's base.
    const viewKeysNeedingFull = new Set<string>();

    for (const client of socketClients) {
      const viewer = viewerFromSocketClient(client);
      const nextKey = getViewKey(game, viewer, state);
      const meta = client.socket.getMeta<{ gameId: number; viewKey: string }>('gameView');
      if (!meta || meta.gameId !== game.id || meta.viewKey !== nextKey) {
        viewKeysNeedingFull.add(nextKey);
      }
      client.socket.join(gameRoom(game.id));
      this.refreshViewRoom(client, game);
    }

    const views = new Map<string, SanitizeViewer>();
    for (const client of socketClients) {
      const viewer = viewerFromSocketClient(client);
      const key = getViewKey(game, viewer, state);
      if (!views.has(key)) {
        if (game.gameSettings.selfPlay === true) {
          views.set(key, {
            playerId: selfPlayFocusPlayerId(state),
            roleId: viewer.roleId,
          });
        } else if (key.startsWith('p')) {
          views.set(key, { playerId: Number(key.slice(1)), roleId: viewer.roleId });
        } else {
          views.set(key, viewer);
        }
      }
    }

    const playerStats = game.playerStats;
    let turnStartEmitted = false;

    for (const [viewKey, viewer] of views) {
      const sanitized = StateSanitizer.sanitizeForViewer(state, viewer, {
        trimLogs: false,
        selfPlay: game.gameSettings.selfPlay === true,
      });

      const activePlayer = sanitized.players[sanitized.activePlayer];
      const prev = cache.get(viewKey);
      if (
        !turnStartEmitted &&
        activePlayer &&
        (prev === undefined || prev.lastActivePlayerId !== activePlayer.id)
      ) {
        io.to(gameRoom(game.id)).emit(`game[${game.id}]:turnStart`, {
          activePlayerId: activePlayer.id,
          activePlayerName: activePlayer.name,
        });
        turnStartEmitted = true;
      }

      const fullSerialized = this.serializer.serialize(sanitized);
      let payloadSerialized = fullSerialized;
      let isDiff = false;
      const mustFull = forceFull || prev === undefined || viewKeysNeedingFull.has(viewKey);

      if (!mustFull && prev !== undefined) {
        payloadSerialized = this.serializer.serializeDiffFromSerialized(prev.serialized, fullSerialized);
        try {
          const parsed = JSON.parse(payloadSerialized);
          isDiff = Array.isArray(parsed) && parsed.length === 1;
        } catch {
          isDiff = false;
          payloadSerialized = fullSerialized;
        }
      }

      cache.set(viewKey, {
        serialized: fullSerialized,
        lastActivePlayerId: activePlayer ? activePlayer.id : null,
      });

      const stateData = this.base64.encode(payloadSerialized);
      io.to(gameViewRoom(game.id, viewKey)).emit(`game[${game.id}]:stateChange`, {
        stateData,
        playerStats,
        isDiff,
        viewKey,
      });
    }
  }

  public static emitFullToClient(client: SocketClient, game: Game): void {
    this.joinRooms(client, game);
    const viewer = viewerFromSocketClient(client);
    const state = game.state;
    const viewKey = getViewKey(game, viewer, state);
    const sanitizeViewer: SanitizeViewer =
      game.gameSettings.selfPlay === true
        ? { playerId: selfPlayFocusPlayerId(state), roleId: viewer.roleId }
        : viewKey.startsWith('p')
          ? { playerId: Number(viewKey.slice(1)), roleId: viewer.roleId }
          : viewer;

    const sanitized = StateSanitizer.sanitizeForViewer(state, sanitizeViewer, {
      trimLogs: false,
      selfPlay: game.gameSettings.selfPlay === true,
    });
    const fullSerialized = this.serializer.serialize(sanitized);
    if (this.viewCache.get(game.id) === undefined) {
      this.viewCache.set(game.id, new Map());
    }
    const activePlayer = sanitized.players[sanitized.activePlayer];
    this.viewCache.get(game.id)!.set(viewKey, {
      serialized: fullSerialized,
      lastActivePlayerId: activePlayer ? activePlayer.id : null,
    });

    const stateData = this.base64.encode(fullSerialized);
    client.socket.emit(`game[${game.id}]:stateChange`, {
      stateData,
      playerStats: game.playerStats,
      isDiff: false,
      viewKey,
    });
  }

  public static buildSanitizedStateData(game: Game, viewer: SanitizeViewer): string {
    const viewKey = getViewKey(game, viewer, game.state);
    const sanitizeViewer: SanitizeViewer =
      game.gameSettings.selfPlay === true
        ? { playerId: selfPlayFocusPlayerId(game.state), roleId: viewer.roleId }
        : viewKey.startsWith('p')
          ? { playerId: Number(viewKey.slice(1)), roleId: viewer.roleId }
          : viewer;
    const sanitized = StateSanitizer.sanitizeForViewer(game.state, sanitizeViewer, {
      trimLogs: false,
      selfPlay: game.gameSettings.selfPlay === true,
    });
    const fullSerialized = this.serializer.serialize(sanitized);

    // Keep diff base aligned with whatever we hand the client on join/create.
    if (this.viewCache.get(game.id) === undefined) {
      this.viewCache.set(game.id, new Map());
    }
    const activePlayer = sanitized.players[sanitized.activePlayer];
    this.viewCache.get(game.id)!.set(viewKey, {
      serialized: fullSerialized,
      lastActivePlayerId: activePlayer ? activePlayer.id : null,
    });

    return this.base64.encode(fullSerialized);
  }
}

export function isSocketClient(client: unknown): client is SocketClient {
  if (!client || typeof client !== 'object') {
    return false;
  }
  const maybe = client as Partial<SocketClient>;
  const wrapper = maybe.socket;
  return !!wrapper
    && typeof wrapper.emit === 'function'
    && typeof wrapper.join === 'function';
}

function gamePlayersSafe(client: SocketClient, gameId: number): number[] {
  const game = client.games.find(g => g.id === gameId);
  return game ? game.state.players.map(p => p.id) : [];
}
