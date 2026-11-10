import { GameSettings, StateSerializer, coerceGameSettings, decompressSnapshotPayload } from '../../game';
import { Client } from '../../game/client/client.interface';
import { Game } from '../../game/core/game';
import { isActiveListGame } from '../../game/core/game-list-utils';
import { GamePhase, State } from '../../game/store/state/state';
import { User } from '../../storage';
import { Core } from '../../game/core/core';
import { CoreInfo, GameInfo, PlayerInfo, GameState, UserInfo } from '../interfaces/core.interface';
import { SocketCache } from './socket-cache';
import { SocketWrapper, Response } from './socket-wrapper';
import { deepCompare } from '../../utils/utils';
import { Base64 } from '../../utils';
import { ApiErrorEnum } from '../common/errors';
import { GameStateBroadcaster, isSocketClient, viewerFromSocketClient } from './game-state-broadcaster';

export class CoreSocket {

  private client: Client;
  private socket: SocketWrapper;
  private core: Core;
  private cache: SocketCache;

  constructor(client: Client, socket: SocketWrapper, core: Core, cache: SocketCache) {
    this.cache = cache;
    this.client = client;
    this.socket = socket;
    this.core = core;

    // core listeners
    this.socket.addListener('core:getInfo', this.getCoreInfo.bind(this));
    this.socket.addListener('core:createGame', this.createGame.bind(this));
    this.socket.addListener('core:createSelfPlayGame', this.createSelfPlayGame.bind(this));
    this.socket.addListener('core:createSelfPlayFromSnapshot', this.createSelfPlayFromSnapshot.bind(this));
  }

  public onConnect(client: Client): void {
    this.socket.emit('core:join', {
      clientId: client.id,
      user: CoreSocket.buildUserInfo(client.user)
    });
  }

  public onDisconnect(client: Client): void {
    this.socket.emit('core:leave', client.id);
  }

  public onGameAdd(game: Game): void {
    if (!isActiveListGame(game)) {
      return;
    }
    this.cache.lastLogIdCache[game.id] = 0;
    this.cache.gameInfoCache[game.id] = CoreSocket.buildGameInfo(game);
    this.socket.emit('core:createGame', this.cache.gameInfoCache[game.id]);
  }

  public onGameDelete(game: Game): void {
    delete this.cache.gameInfoCache[game.id];
    delete this.cache.lastLogIdCache[game.id];
    this.socket.emit('core:deleteGame', game.id);
  }

  public onStateChange(game: Game, state: State): void {
    const gameInfo = CoreSocket.buildGameInfo(game);
    const gameInfoChanged = !deepCompare(gameInfo, this.cache.gameInfoCache[game.id]);

    if (!gameInfoChanged) {
      return;
    }

    if (!isActiveListGame(game)) {
      delete this.cache.gameInfoCache[game.id];
      this.socket.emit('core:deleteGame', game.id);
      return;
    }

    this.cache.gameInfoCache[game.id] = gameInfo;
    this.socket.emit('core:gameInfo', gameInfo);
  }

  public onUsersUpdate(users: User[]): void {
    const core = this.client.core;
    if (core === undefined) {
      return;
    }

    const me = users.find(u => u.id === this.client.user.id);
    if (me !== undefined) {
      this.client.user = me;
    }

    const userInfos = users.map(u => {
      const connected = core.clients.some(c => c.user.id === u.id);
      return CoreSocket.buildUserInfo(u, connected);
    });
    this.socket.emit('core:usersInfo', userInfos);
  }

  private buildCoreInfo(): CoreInfo {
    const reconnectableGameId = this.core.getReconnectableGameId(this.client.user.id);
    return {
      clientId: this.client.id,
      clients: this.core.clients.map(client => ({
        clientId: client.id,
        userId: client.user.id
      })),
      users: this.core.clients.map(client => CoreSocket.buildUserInfo(client.user)),
      games: this.core.games.filter(isActiveListGame).map(game => CoreSocket.buildGameInfo(game)),
      ...(reconnectableGameId !== undefined && { reconnectableGameId })
    };
  }

  private getCoreInfo(data: void, response: Response<CoreInfo>): void {
    response('ok', this.buildCoreInfo());
  }

  private createGame(params: { deck: string[], gameSettings: GameSettings, clientId?: number, artworks?: { code: string; artworkId?: number }[], deckId?: number, sleeveImagePath?: string, deckBoxImagePath?: string, coinImagePath?: string },
    response: Response<GameState>): void {
    const gameSettings = coerceGameSettings(params.gameSettings);
    // Validate that only admins can enable sandbox mode
    if (gameSettings.sandboxMode && this.client.user.roleId !== 4) {
      response('error', ApiErrorEnum.ACTION_INVALID);
      return;
    }

    const invited = this.core.clients.find(c => c.id === params.clientId);

    // Check if the invited client is a bot with format restrictions
    if (invited && this.isBotClient(invited)) {
      const botClient = invited as any; // Cast to access bot-specific methods
      if (!botClient.isFormatAllowed(gameSettings.format)) {
        response('error', ApiErrorEnum.INVALID_FORMAT);
        return;
      }
    }

    const game = this.core.createGame(this.client, params.deck, gameSettings, invited, params.deckId, undefined, params.sleeveImagePath, params.deckBoxImagePath, params.coinImagePath);
    response('ok', CoreSocket.buildGameState(game, this.client));
  }

  private createSelfPlayGame(
    params: {
      deck: string[];
      secondDeck: string[];
      gameSettings: GameSettings;
      deckId?: number;
      secondDeckId?: number;
      sleeveImagePath?: string;
      secondSleeveImagePath?: string;
      deckBoxImagePath?: string;
      secondDeckBoxImagePath?: string;
      coinImagePath?: string;
      secondCoinImagePath?: string;
    },
    response: Response<GameState>,
  ): void {
    const gameSettings = coerceGameSettings(params.gameSettings);
    if (gameSettings.sandboxMode && this.client.user.roleId !== 4) {
      response('error', ApiErrorEnum.ACTION_INVALID);
      return;
    }
    const game = this.core.createSelfPlayGame(
      this.client,
      params.deck,
      params.secondDeck,
      gameSettings,
      params.deckId,
      params.secondDeckId,
      params.sleeveImagePath,
      params.secondSleeveImagePath,
      params.deckBoxImagePath,
      params.secondDeckBoxImagePath,
      params.coinImagePath,
      params.secondCoinImagePath
    );
    response('ok', CoreSocket.buildGameState(game, this.client));
  }

  private createSelfPlayFromSnapshot(
    params: { stateData?: string; snapshotData?: string },
    response: Response<GameState>,
  ): void {
    try {
      let payload: Parameters<Core['createSelfPlayFromState']>[1];
      if (params.snapshotData) {
        const raw = new Base64().decode(params.snapshotData);
        payload = decompressSnapshotPayload(raw);
      } else if (params.stateData) {
        const base64 = new Base64();
        payload = params.stateData.includes('[') ? params.stateData : base64.decode(params.stateData);
      } else {
        response('error', ApiErrorEnum.VALIDATION_INVALID_PARAM);
        return;
      }
      const game = this.core.createSelfPlayFromState(this.client, payload);
      response('ok', CoreSocket.buildGameState(game, this.client));
    } catch (error) {
      console.error('createSelfPlayFromSnapshot failed:', error);
      response('error', ApiErrorEnum.SERVER_ERROR);
    }
  }

  public static buildUserInfo(user: User, connected: boolean = true): UserInfo {
    return {
      connected,
      userId: user.id,
      name: user.name,
      email: user.email,
      registered: user.registered,
      lastSeen: user.lastSeen,
      ranking: user.ranking,
      rank: user.getRank(),
      lastRankingChange: user.lastRankingChange,
      avatarFile: user.avatarFile,
      roleId: user.roleId
    };
  }

  private static buildGameInfo(game: Game): GameInfo {
    const state = game.state;
    const players: PlayerInfo[] = state.players.map(player => ({
      clientId: player.id,
      name: player.name,
      prizes: player.prizes.reduce((sum, cardList) => sum + cardList.cards.length, 0),
      deck: player.deck.cards.length
    }));
    const invitePrompt = state.prompts.find(
      p => p.type === 'Invite player' && p.result === undefined
    );
    const pendingInvite =
      state.phase === GamePhase.WAITING_FOR_PLAYERS && invitePrompt !== undefined;
    return {
      gameId: game.id,
      phase: state.phase,
      turn: state.turn,
      activePlayer: state.activePlayer,
      players,
      playerUserIds: game.getPlayerUserIds(),
      format: game.format,
      pendingInvite: pendingInvite || undefined,
      inviteeClientId: pendingInvite ? invitePrompt!.playerId : undefined
    };
  }

  public static buildGameState(game: Game, client?: Client): GameState {
    let stateData: string;
    if (client && isSocketClient(client)) {
      stateData = GameStateBroadcaster.buildSanitizedStateData(
        game,
        viewerFromSocketClient(client)
      );
      GameStateBroadcaster.joinRooms(client, game);
    } else {
      const serializer = new StateSerializer();
      const serializedState = serializer.serialize(game.state);
      const base64 = new Base64();
      stateData = base64.encode(serializedState);
    }
    const undo = client ? game.getUndoAvailability(client) : { canUndo: false };
    return {
      gameId: game.id,
      stateData,
      clientIds: game.clients.map(c => c.id),
      recordingEnabled: game.gameSettings.recordingEnabled,
      timeLimit: game.gameSettings.timeLimit,
      playerStats: game.playerStats,
      format: game.format,
      undoEnabled: game.gameSettings.undoEnabled === true,
      deepUndoEnabled: game.gameSettings.deepUndoEnabled === true,
      canUndo: undo.canUndo,
      undoOwnerId: undo.undoOwnerId,
    };
  }

  public dispose(): void {
    this.socket.removeListener('core:getInfo');
    this.socket.removeListener('core:createGame');
    this.socket.removeListener('core:createSelfPlayGame');
    this.socket.removeListener('core:createSelfPlayFromSnapshot');
  }

  private isBotClient(client: Client): boolean {
    // Check if the client has bot-specific methods
    return 'isFormatAllowed' in client && 'getAllowedFormats' in client;
  }
}