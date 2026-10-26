import { Action } from '../store/actions/action';
import { Arbiter } from './arbiter';
import { Client } from '../client/client.interface';
import { Core } from './core';
import { GameSettings } from './game-settings';
import { MatchRecorder } from './match-recorder';
import { PlayerStats } from './player-stats';
import { ResolvePromptAction } from '../store/actions/resolve-prompt-action';
import { State, GamePhase } from '../store/state/state';
import { Store } from '../store/store';
import { StoreHandler } from '../store/store-handler';
import { AbortGameAction, AbortGameReason } from '../store/actions/abort-game-action';
import { AddPlayerAction } from '../store/actions/add-player-action';
import { PlayCardAction } from '../store/actions/play-card-action';
import { ConcedeAction } from '../store/actions/concede-action';
import { AppendLogAction } from '../store/actions/append-log-action';
import { ChangeAvatarAction } from '../store/actions/change-avatar-action';
import { Format as FormatId } from '../store/card/card-types';
import { Format } from '../store/format/format';
import { FormatManager } from '../format/format-manager';
import { CheckHpEffect } from '../store/effects/check-effects';
import { ShuffleDeckPrompt } from '../store/prompts/shuffle-prompt';
import { logger } from '../../utils/logger';

function getBroadcaster(): typeof import('../../backend/socket/game-state-broadcaster') {
  return require('../../backend/socket/game-state-broadcaster');
}

export interface DisconnectedPlayer {
  clientId: number;
  disconnectedAt: number;
  wasActivePlayer: boolean;
  timeLeftWhenDisconnected: number;
}

export class Game implements StoreHandler {

  private readonly maxInvalidMoves: number = 100;

  public id: number;
  public clients: Client[] = [];
  public playerStats: PlayerStats[] = [];
  private arbiter = new Arbiter();
  private store: Store;
  private matchRecorder: MatchRecorder;
  private timeoutRef: NodeJS.Timeout | undefined;
  private lastActivity: number = Date.now();
  public format: FormatId = FormatId.STANDARD;
  public formatDefinition?: Format;
  private periodicSyncRef: NodeJS.Timeout | undefined;
  private lastStateEmitAt: number = 0;
  private readonly periodicSyncIntervalMs: number = 15000;

  // Reconnection-related properties
  private disconnectedPlayers: Map<number, DisconnectedPlayer> = new Map();
  private disconnectionTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private isPaused: boolean = false;
  private pausedAt: number = 0;
  private userIdToPlayerId: Map<number, number> = new Map();
  private selfPlayUserId: number | null = null;
  private previousPlayerCount: number = 0;

  constructor(private core: Core, id: number, public gameSettings: GameSettings) {
    this.id = id;
    this.format = gameSettings.format;
    this.formatDefinition = FormatManager.getInstance().getFormatById(this.format);
    this.store = new Store(this, this.formatDefinition, this.format);
    this.store.state.rules = gameSettings.rules;
    this.store.state.gameSettings = gameSettings;
    this.matchRecorder = new MatchRecorder(core, gameSettings);
  }

  public get state(): State {
    return this.store.state;
  }

  public getStore(): Store {
    return this.store;
  }

  public updateLastActivity(): void {
    this.lastActivity = Date.now();
  }

  public getLastActivity(): number {
    return this.lastActivity;
  }

  public isInactive(timeoutMs: number = 5 * 60 * 1000): boolean {
    return Date.now() - this.lastActivity > timeoutMs;
  }

  public cleanup(): void {
    this.stopTimer();
    if (this.matchRecorder) {
      this.matchRecorder.cleanup();
    }
    this.store.cleanup();
    this.arbiter.cleanup();
    this.clearAllDisconnectionTimeouts();
    this.disconnectedPlayers.clear();
    this.isPaused = false;
    this.userIdToPlayerId.clear();
    this.selfPlayUserId = null;
  }

  public setBonusHps(state: State): void {
    for (const player of state.players) {
      if (player.active.getPokemonCard() !== undefined) {
        const checkHp = new CheckHpEffect(player, player.active);
        this.store.reduceEffect(state, checkHp);
      }
      for (let b = 0; b < player.bench.length; b++) {
        if (player.bench[b].getPokemonCard() !== undefined) {
          const checkHp = new CheckHpEffect(player, player.bench[b]);
          this.store.reduceEffect(state, checkHp);
        }
      }
    }
  }

  public onStateChange(state: State): void {
    this.updateLastActivity();
    if (this.handleArbiterPrompts(state)) {
      return;
    }

    if (this.gameSettings.recordingEnabled) {
      this.matchRecorder.onStateChange(state);
    }

    this.updateIsTimeRunning(state);
    const playerAdded = state.players.length > this.previousPlayerCount;
    this.previousPlayerCount = state.players.length;
    this.setBonusHps(state);

    const { GameStateBroadcaster, isSocketClient } = getBroadcaster();
    const socketClients: Client[] = [];
    for (const c of this.clients) {
      if (isSocketClient(c)) {
        socketClients.push(c);
      } else if (typeof c.onStateChange === 'function') {
        c.onStateChange(this, state);
      }
    }

    if (socketClients.length > 0) {
      GameStateBroadcaster.broadcast(this, state);
      for (const c of socketClients) {
        c.onStateChange(this, state);
      }
    }
    this.lastStateEmitAt = Date.now();

    if (playerAdded) {
      this.core.emit(c => {
        if (typeof c.onStateChange === 'function') {
          c.onStateChange(this, state);
        }
      });
    }

    if (state.phase === GamePhase.FINISHED) {
      this.clearAllDisconnectionTimeouts();
    }

    if (state.phase !== GamePhase.FINISHED && this.timeoutRef === undefined) {
      this.startTimer();
    }

    if (state.phase !== GamePhase.FINISHED && this.periodicSyncRef === undefined) {
      this.startPeriodicSync();
    }

    if (state.phase === GamePhase.FINISHED) {
      this.stopTimer();
      this.stopPeriodicSync();
      GameStateBroadcaster.clearGame(this.id);
      this.core.deleteGame(this);
    }
  }

  private handleArbiterPrompts(state: State): boolean {
    let resolved: { id: number, action: ResolvePromptAction } | undefined;
    let resolvedPrompt = undefined as (typeof state.prompts)[number] | undefined;
    const unresolved = state.prompts.filter(item => item.result === undefined);

    for (let i = 0; i < unresolved.length; i++) {
      const action = this.arbiter.resolvePrompt(state, unresolved[i]);
      if (action !== undefined) {
        resolved = { id: unresolved[i].id, action };
        resolvedPrompt = unresolved[i];
        break;
      }
    }

    if (resolved === undefined) {
      return false;
    }

    if (resolvedPrompt instanceof ShuffleDeckPrompt) {
      this.emitDeckShuffle(resolvedPrompt.getPerspectivePlayerId());
    }

    this.store.dispatch(resolved.action);
    return true;
  }

  private emitDeckShuffle(playerId: number): void {
    this.core.emit((c: any) => {
      if (typeof c.socket !== 'undefined') {
        c.socket.emit(`game[${this.id}]:deckShuffle`, { playerId });
      }
    });
  }

  public dispatch(client: Client, action: Action): State {
    let state = this.store.state;
    const movePid = this.playerIdForInvalidMoves(client, action);
    try {
      const clientRoleId = client.user?.roleId;
      state = this.store.dispatch(action, clientRoleId);
      state = this.updateInvalidMoves(state, movePid, false);

      if (action instanceof AddPlayerAction) {
        if (!this.gameSettings.selfPlay || action.clientId === client.id) {
          this.registerPlayer(client);
        }
      }
    } catch (error) {
      state = this.updateInvalidMoves(state, movePid, true);
      throw error;
    }
    return state;
  }

  public handleClientLeave(client: Client): void {
    const state = this.store.state;
    if (state.phase === GamePhase.FINISHED) {
      return;
    }

    const player = state.players.find(p => p.id === client.id);
    if (player !== undefined) {
      this.handlePlayerDisconnection(client);
    }
  }

  public registerPlayer(client: Client): void {
    if (!client.user) {
      return;
    }

    const player = this.state.players.find(p => p.id === client.id);
    if (!player) {
      return;
    }

    this.userIdToPlayerId.set(client.user.id, player.id);
  }

  public getPlayerIdForUser(userId: number): number | undefined {
    return this.userIdToPlayerId.get(userId);
  }

  public getPlayerUserIds(): number[] {
    return Array.from(this.userIdToPlayerId.keys());
  }

  public initSelfPlay(userId: number): void {
    this.selfPlayUserId = userId;
  }

  public isSelfPlayForUser(userId: number): boolean {
    return this.gameSettings.selfPlay === true && this.selfPlayUserId === userId;
  }

  public handlePlayerDisconnection(client: Client): void {
    const state = this.store.state;

    if (state.phase === GamePhase.FINISHED) {
      return;
    }

    const player = state.players.find(p => p.id === client.id);
    if (!player) {
      return;
    }

    if (this.gameSettings.selfPlay === true) {
      this.disconnectedPlayers.clear();
      this.disconnectionTimeouts.forEach(t => clearTimeout(t));
      this.disconnectionTimeouts.clear();
      if (this.isPaused) {
        this.resumeGame();
      }
      this.clients = this.clients.filter(c => c.id !== client.id);
      try {
        this.store.dispatch(new AbortGameAction(client.id, AbortGameReason.DISCONNECTED));
      } catch (e) {
        logger.log(`Self-play disconnect abort error: ${String(e)}`);
      }
      return;
    }

    const playerStats = this.playerStats.find(p => p.clientId === client.id);
    const wasActivePlayer = state.activePlayer !== undefined && state.players[state.activePlayer]?.id === client.id;

    const disconnectedPlayer: DisconnectedPlayer = {
      clientId: client.id,
      disconnectedAt: Date.now(),
      wasActivePlayer,
      timeLeftWhenDisconnected: playerStats?.timeLeft || 0
    };

    this.disconnectedPlayers.set(client.id, disconnectedPlayer);
    this.clients = this.clients.filter(c => c.id !== client.id);

    if (wasActivePlayer && !this.isPaused) {
      this.pauseGame();
    }

    const existingTimeout = this.disconnectionTimeouts.get(client.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const disconnectForfeitMs = this.core.getReconnectionManager().getCurrentConfig().disconnectForfeitMs ?? 60 * 1000;
    const timeout = setTimeout(() => {
      if (this.disconnectedPlayers.has(client.id) && this.state.phase !== GamePhase.FINISHED) {
        this.handleReconnectionTimeout(client.id);
      }
      this.disconnectionTimeouts.delete(client.id);
    }, disconnectForfeitMs);

    this.disconnectionTimeouts.set(client.id, timeout);

    this.notifyPlayersOfDisconnection(client);

    logger.log(`Player disconnected from game: gameId=${this.id}, playerId=${client.id}, playerName=${client.name}, wasActivePlayer=${wasActivePlayer}, gamePhase=${state.phase}`);
  }

  public handlePlayerReconnection(client: Client): boolean {
    const disconnectedPlayer = this.disconnectedPlayers.get(client.id);

    if (!disconnectedPlayer) {
      logger.log(`Attempted reconnection for player not in disconnected list: gameId=${this.id}, playerId=${client.id}`);
      return false;
    }

    const state = this.store.state;

    if (state.phase === GamePhase.FINISHED) {
      this.disconnectedPlayers.delete(client.id);
      const timeout = this.disconnectionTimeouts.get(client.id);
      if (timeout) {
        clearTimeout(timeout);
        this.disconnectionTimeouts.delete(client.id);
      }
      return false;
    }

    const timeout = this.disconnectionTimeouts.get(client.id);
    if (timeout) {
      clearTimeout(timeout);
      this.disconnectionTimeouts.delete(client.id);
    }

    this.clients.push(client);

    const playerStats = this.playerStats.find(p => p.clientId === client.id);
    if (playerStats) {
      if (this.isPaused) {
        playerStats.timeLeft = disconnectedPlayer.timeLeftWhenDisconnected;
      } else {
        const timePassed = Math.floor((Date.now() - disconnectedPlayer.disconnectedAt) / 1000);
        playerStats.timeLeft = Math.max(0, disconnectedPlayer.timeLeftWhenDisconnected - timePassed);
      }
    }

    if (this.isPaused && disconnectedPlayer.wasActivePlayer) {
      this.resumeGame();
    }

    this.disconnectedPlayers.delete(client.id);
    this.synchronizeReconnectedPlayer(client);
    this.notifyPlayersOfReconnection(client);

    const disconnectionDuration = Date.now() - disconnectedPlayer.disconnectedAt;
    logger.log(`Player reconnected to game: gameId=${this.id}, playerId=${client.id}, playerName=${client.name}, disconnectionDuration=${disconnectionDuration}, gamePhase=${state.phase}`);

    return true;
  }

  private synchronizeReconnectedPlayer(client: Client): void {
    if (typeof client.onStateChange === 'function') {
      client.onStateChange(this, this.store.state);
    }
    if (typeof client.onTimerUpdate === 'function') {
      client.onTimerUpdate(this, this.playerStats);
    }
  }

  private pauseGame(): void {
    if (this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.pausedAt = Date.now();
    this.stopTimer();

    logger.log(`Game paused due to player disconnection: gameId=${this.id}, gamePhase=${this.store.state.phase}`);
  }

  private resumeGame(): void {
    if (!this.isPaused) {
      return;
    }

    this.isPaused = false;
    const pauseDuration = Date.now() - this.pausedAt;
    if (this.store.state.phase !== GamePhase.FINISHED) {
      this.startTimer();
    }

    logger.log(`Game resumed after player reconnection: gameId=${this.id}, pauseDuration=${pauseDuration}, gamePhase=${this.store.state.phase}`);
  }

  private notifyPlayersOfDisconnection(disconnectedClient: Client): void {
    this.clients.forEach(client => {
      if (client.id !== disconnectedClient.id && typeof client.onPlayerDisconnected === 'function') {
        client.onPlayerDisconnected(this, disconnectedClient);
      }
    });
    this.notifyConnectionStatusUpdate();
  }

  private notifyPlayersOfReconnection(reconnectedClient: Client): void {
    this.clients.forEach(client => {
      if (client.id !== reconnectedClient.id && typeof client.onPlayerReconnected === 'function') {
        client.onPlayerReconnected(this, reconnectedClient);
      }
    });
    this.notifyConnectionStatusUpdate();
  }

  public isPlayerDisconnected(clientId: number): boolean {
    return this.disconnectedPlayers.has(clientId);
  }

  public getDisconnectedPlayerInfo(clientId: number): DisconnectedPlayer | undefined {
    return this.disconnectedPlayers.get(clientId);
  }

  public getDisconnectedPlayers(): DisconnectedPlayer[] {
    return Array.from(this.disconnectedPlayers.values());
  }

  public isPausedForDisconnection(): boolean {
    return this.isPaused;
  }

  public handleReconnectionTimeout(clientId: number): void {
    const disconnectedPlayer = this.disconnectedPlayers.get(clientId);

    if (!disconnectedPlayer) {
      return;
    }

    const playerStats = this.playerStats.find(p => p.clientId === clientId);
    const playerName = playerStats ? this.state.players.find(p => p.id === clientId)?.name || 'Unknown' : 'Unknown';
    this.notifyPlayersOfReconnectionTimeout(clientId, playerName);
    this.disconnectedPlayers.delete(clientId);
    const timeout = this.disconnectionTimeouts.get(clientId);
    if (timeout) {
      clearTimeout(timeout);
      this.disconnectionTimeouts.delete(clientId);
    }

    if (this.isPaused && disconnectedPlayer.wasActivePlayer) {
      this.resumeGame();
    }

    const action = new AbortGameAction(clientId, AbortGameReason.DISCONNECTED);
    this.store.dispatch(action);

    logger.log(`Player reconnection timeout - game aborted: gameId=${this.id}, playerId=${clientId}, disconnectionDuration=${Date.now() - disconnectedPlayer.disconnectedAt}`);
  }

  private clearAllDisconnectionTimeouts(): void {
    for (const timeout of this.disconnectionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.disconnectionTimeouts.clear();
  }

  public getConnectionStatuses(): Array<{ playerId: number, playerName: string, isConnected: boolean, disconnectedAt?: number }> {
    const statuses: Array<{ playerId: number, playerName: string, isConnected: boolean, disconnectedAt?: number }> = [];

    this.state.players.forEach(player => {
      const isConnected = this.clients.some(c => c.id === player.id);
      const disconnectedPlayer = this.disconnectedPlayers.get(player.id);

      statuses.push({
        playerId: player.id,
        playerName: player.name,
        isConnected,
        disconnectedAt: disconnectedPlayer?.disconnectedAt
      });
    });

    return statuses;
  }

  public notifyConnectionStatusUpdate(): void {
    const connectionStatuses = this.getConnectionStatuses();

    this.clients.forEach(client => {
      if (typeof (client as any).onConnectionStatusUpdate === 'function') {
        (client as any).onConnectionStatusUpdate(this, connectionStatuses);
      }
    });
  }

  private notifyPlayersOfReconnectionTimeout(playerId: number, playerName: string): void {
    this.clients.forEach(client => {
      if (typeof (client as any).onReconnectionTimeout === 'function') {
        (client as any).onReconnectionTimeout(this, playerId, playerName);
      }
    });
  }

  public sendTimeoutWarning(clientId: number, timeRemaining: number): void {
    const client = this.clients.find(c => c.id === clientId);
    if (client && typeof (client as any).onTimeoutWarning === 'function') {
      (client as any).onTimeoutWarning(this, timeRemaining);
    }
  }

  private playerIdForInvalidMoves(client: Client, action: Action): number {
    if (this.gameSettings.selfPlay !== true) {
      return client.id;
    }
    if (action instanceof AddPlayerAction) {
      return action.clientId;
    }
    if (action instanceof PlayCardAction) {
      return action.id;
    }
    if (action instanceof ConcedeAction) {
      return action.playerId;
    }
    if (action instanceof AppendLogAction) {
      return action.id;
    }
    if (action instanceof AbortGameAction) {
      return action.culpritId;
    }
    if (action instanceof ChangeAvatarAction) {
      return action.id;
    }
    if (action instanceof ResolvePromptAction) {
      const prompt = this.store.state.prompts.find(p => p.id === action.id);
      return prompt?.playerId ?? client.id;
    }
    const a: any = action;
    if (typeof a.clientId === 'number') {
      return a.clientId;
    }
    if (typeof a.playerId === 'number') {
      return a.playerId;
    }
    return client.id;
  }

  private updateInvalidMoves(state: State, playerId: number, isInvalidMove: boolean): State {
    if (state.phase === GamePhase.FINISHED) {
      return state;
    }

    const isPlayer = state.players.some(p => p.id === playerId);
    if (isPlayer === false) {
      return state;
    }

    const stats = this.playerStats.find(p => p.clientId === playerId);
    if (stats === undefined) {
      return state;
    }
    stats.invalidMoves = isInvalidMove ? stats.invalidMoves + 1 : 0;

    if (stats.invalidMoves > this.maxInvalidMoves) {
      const action = new AbortGameAction(playerId, AbortGameReason.ILLEGAL_MOVES);
      state = this.store.dispatch(action);
    }

    return state;
  }

  private updateIsTimeRunning(state: State) {
    state.players.forEach(player => {
      const stats = this.playerStats.find(p => p.clientId === player.id);
      if (stats === undefined) {
        this.playerStats.push({
          clientId: player.id,
          isTimeRunning: false,
          invalidMoves: 0,
          timeLeft: this.gameSettings.timeLimit
        });
      }
    });

    const activePlayers = this.getTimeRunningPlayers(state);
    this.playerStats.forEach(p => {
      p.isTimeRunning = activePlayers.includes(p.clientId);
    });
  }

  private getTimeRunningPlayers(state: State): number[] {
    if (state.phase === GamePhase.WAITING_FOR_PLAYERS) {
      return [];
    }

    const result: number[] = [];
    state.prompts.filter(p => p.result === undefined).forEach(p => {
      if (!result.includes(p.playerId)) {
        result.push(p.playerId);
      }
    });

    if (result.length > 0) {
      return result;
    }

    const player = state.players[state.activePlayer];
    if (player !== undefined) {
      result.push(player.id);
    }

    return result;
  }

  private startTimer() {
    const intervalDelay = 1000; // 1 second

    if (this.gameSettings.timeLimit === 0) {
      return;
    }

    if (this.isPaused) {
      return;
    }

    this.timeoutRef = setInterval(() => {
      if (this.isPaused) {
        return;
      }

      for (const stats of this.playerStats) {
        const isDisconnected = this.isPlayerDisconnected(stats.clientId);

        if (stats.isTimeRunning && !isDisconnected) {
          stats.timeLeft -= 1;
          if (stats.timeLeft <= 0) {
            const action = new AbortGameAction(stats.clientId, AbortGameReason.TIME_ELAPSED);
            this.store.dispatch(action);
            return;
          }
        }
      }

      this.clients.forEach(client => {
        if (typeof client.onTimerUpdate === 'function') {
          client.onTimerUpdate(this, this.playerStats);
        }
      });
    }, intervalDelay);
  }

  private stopTimer() {
    if (this.timeoutRef !== undefined) {
      clearInterval(this.timeoutRef);
      this.timeoutRef = undefined;
    }
  }

  private startPeriodicSync() {
    this.periodicSyncRef = setInterval(() => {
      if (Date.now() - this.lastStateEmitAt < this.periodicSyncIntervalMs) {
        return;
      }
      getBroadcaster().GameStateBroadcaster.broadcast(this, this.state, { forceFull: true });
      this.lastStateEmitAt = Date.now();
    }, this.periodicSyncIntervalMs);
  }

  private stopPeriodicSync() {
    if (this.periodicSyncRef !== undefined) {
      clearInterval(this.periodicSyncRef);
      this.periodicSyncRef = undefined;
    }
  }
}