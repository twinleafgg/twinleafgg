import { Injectable } from '@angular/core';
import {
  ClientInfo, GameState, State, CardTarget, Replay,
  Base64, StateSerializer, PlayerStats, GamePhase
} from 'ptcg-server';
import { Observable, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { catchError, finalize, map } from 'rxjs/operators';

import { AlertService } from '../../shared/alert/alert.service';
import { ApiError } from '../api.error';
import { ApiService } from '../api.service';
import { LocalGameState, PlayerGameStats } from '../../shared/session/session.interface';
import { isValidPlayerGameStats, sanitizePlayerGameStats } from '../../shared/session/game-stats.utils';
import { PlayerStatsResponse } from '../interfaces/game.interface';
import { SocketService } from '../socket.service';
import { SessionService } from '../../shared/session/session.service';
import { BoardInteractionService } from '../../shared/services/board-interaction.service';
import { SoundService } from '../../shared/services/sound.service';
import { CardType, PlayerType, StateUtils } from 'ptcg-server';

export interface GameUserInfo {
  gameId: number;
  userInfo: ClientInfo;
}

@Injectable()
export class GameService {

  constructor(
    private api: ApiService,
    private alertService: AlertService,
    private sessionService: SessionService,
    public socketService: SocketService,
    private translate: TranslateService,
    private boardInteractionService: BoardInteractionService,
    private soundService: SoundService
  ) {
    this.socketService.rejoinSuccess$.subscribe((gameState) => {
      this.appendGameState(gameState);
      const localGameState = this.sessionService.session.gameStates.find(
        g => g.gameId === gameState.gameId && g.deleted === false
      );
      if (localGameState) {
        const clientId = this.sessionService.session.clientId;
        const isPlayer = localGameState.state.players.some(p => p.id === clientId);
        if (isPlayer) {
          this.socketService.setGameId(gameState.gameId);
        }
      }
    });
  }

  public getPlayerStats(gameId: number) {
    return this.api.get<PlayerStatsResponse>('/v1/game/' + gameId + '/playerStats');
  }

  public join(gameId: number): Observable<GameState> {
    this.boardInteractionService.endBoardSelection();

    return new Observable<GameState>(observer => {
      this.socketService.emit<number, GameState>('game:join', gameId)
        .pipe(finalize(() => observer.complete()))
        .subscribe((gameState: GameState) => {
          this.appendGameState(gameState);

          // Only set game ID for reconnection tracking if the user is actually a player
          // Check if the user's client ID is in the game's clientIds array
          // and verify they are in the players array (not just a spectator)
          const localGameState = this.sessionService.session.gameStates.find(
            g => g.gameId === gameId && g.deleted === false
          );
          if (localGameState) {
            const clientId = this.sessionService.session.clientId;
            const isPlayer = localGameState.state.players.some(p => p.id === clientId);
            if (isPlayer) {
              // User is a player, set game ID for reconnection tracking
              this.socketService.setGameId(gameId);
            }
          }

          observer.next(gameState);
        }, (error: any) => {
          observer.error(error);
        });
    });
  }

  public appendGameState(gameState: GameState, replay?: Replay): LocalGameState | undefined {
    const gameId = gameState.gameId;
    const games = this.sessionService.session.gameStates;
    const index = games.findIndex(g => g.gameId === gameId && g.deleted === false);
    if (index === -1) {
      let lastGameId = this.sessionService.session.lastGameId || 0;
      lastGameId++;
      const { state, serializedBase } = this.decodeStateData(gameState.stateData)!;
      const enhancedPlayerStats = this.extractPlayerGameStats(state);

      const localGameState: LocalGameState = {
        ...gameState,
        localId: lastGameId,
        gameOver: replay ? true : false,
        deleted: replay ? true : false,
        switchSide: false,
        promptMinimized: false,
        state,
        logs: [...state.logs],
        replayPosition: 1,
        replay,
        enhancedPlayerStats: enhancedPlayerStats,
        serializedBase,
      };
      const gameStates = [...games, localGameState];
      this.startListening(gameState.gameId);
      this.sessionService.set({ gameStates, lastGameId });
      return localGameState;
    }
  }

  public markAsDeleted(gameId: number) {
    const games = this.sessionService.session.gameStates;
    const index = games.findIndex(g => g.gameId === gameId && g.deleted === false);
    if (index !== -1) {
      const gameStates = this.sessionService.session.gameStates.slice();
      // Keep listening so the FINISHED stateChange can still arrive and show game-over UI.
      // Listeners are removed in removeLocalGameState / removeGameState when the user leaves.
      gameStates[index] = { ...gameStates[index], deleted: true };
      this.sessionService.set({ gameStates });
    }
  }

  public setPromptMinimized(gameId: number, minimized: boolean) {
    const games = this.sessionService.session.gameStates;
    const index = games.findIndex(g => g.localId === gameId);
    if (index !== -1) {
      const gameStates = this.sessionService.session.gameStates.slice();
      gameStates[index] = { ...gameStates[index], promptMinimized: minimized };
      this.sessionService.set({ gameStates });
    }
  }

  public removeGameState(gameId: number) {
    const games = this.sessionService.session.gameStates;
    const index = games.findIndex(g => g.gameId === gameId && g.deleted === false);
    if (index !== -1) {
      const gameStates = games.filter(g => g.gameId !== gameId || g.deleted !== false);
      this.stopListening(gameId);
      this.sessionService.set({ gameStates });
    }
  }

  public removeLocalGameState(localGameId: number) {
    const games = this.sessionService.session.gameStates;
    const index = games.findIndex(g => g.localId === localGameId);
    if (index !== -1) {
      const gameId = games[index].gameId;
      const gameStates = games.filter(table => table.localId !== localGameId);
      this.stopListening(gameId);
      this.sessionService.set({ gameStates });
    }
  }

  public leave(gameId: number) {
    // Clear the game ID for reconnection tracking
    this.socketService.clearGameId();

    const games = this.sessionService.session.gameStates;
    const index = games.findIndex(g => g.gameId === gameId && g.deleted === false);
    if (index !== -1) {
      // Use concede instead of leave to properly forfeit the game
      this.socketService.emit('game:concede', { gameId })
        .subscribe(() => {
          // Don't immediately remove the game state - let the server send the FINISHED state first
          // The game will be removed when the user confirms the game over dialog
        }, (error: ApiError) => this.handleError(error));
    }
  }

  public ability(gameId: number, ability: string, target: CardTarget) {
    this.socketService.emit('game:action:ability', { gameId, ability, target })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public trainerAbility(gameId: number, ability: string, target: CardTarget) {
    this.socketService.emit('game:action:trainerAbility', { gameId, ability, target })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public energyAbility(gameId: number, ability: string, target: CardTarget) {
    this.socketService.emit('game:action:energyAbility', { gameId, ability, target })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public attack(gameId: number, attack: string) {
    this.socketService.emit('game:action:attack', { gameId, attack })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public stadium(gameId: number) {
    this.socketService.emit('game:action:stadium', { gameId })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public play(gameId: number, deck: string[]) {
    this.socketService.emit('game:action:play', { gameId, deck })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public resolvePrompt(gameId: number, promptId: number, result: any) {
    this.socketService.emit('game:action:resolvePrompt', { gameId, id: promptId, result })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public playCardAction(gameId: number, handIndex: number, target: CardTarget): Observable<void> {
    return this.socketService.emit('game:action:playCard', { gameId, handIndex, target }).pipe(
      map(() => undefined),
      catchError((error: ApiError) => {
        this.handleError(error);
        return throwError(() => error);
      })
    );
  }

  public reorderBenchAction(gameId: number, from: number, to: number) {
    this.socketService.emit('game:action:reorderBench', { gameId, from, to })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public reorderHandAction(gameId: number, order: number[]) {
    this.socketService.emit('game:action:reorderHand', { gameId, order })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public retreatAction(gameId: number, to: number) {
    this.socketService.emit('game:action:retreat', { gameId, to })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public retreatStart(gameId: number) {
    this.socketService.emit('game:action:retreatStart', { gameId })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public passTurnAction(gameId: number) {
    this.socketService.emit('game:action:passTurn', { gameId })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public undoAction(gameId: number) {
    this.socketService.emit('game:action:undo', { gameId })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public createSnapshot(gameId: number) {
    return this.api.post<{ ok: boolean; code: string; snapshotData: string }>('/v1/snapshots/create', { gameId });
  }

  public createSnapshotFromMatch(matchId: number, position: number) {
    return this.api.post<{ ok: boolean; code: string; snapshotData: string }>('/v1/snapshots/create', {
      matchId,
      position,
    });
  }

  public createSnapshotFromReplay(replayId: number, position: number) {
    return this.api.post<{ ok: boolean; code: string; snapshotData: string }>('/v1/snapshots/create', {
      replayId,
      position,
    });
  }

  public getSnapshot(code: string) {
    return this.api.get<{ ok: boolean; code: string; snapshotData: string }>(
      '/v1/snapshots/' + encodeURIComponent(code)
    );
  }

  public playSnapshot(params: { code?: string; snapshotData?: string }) {
    return this.api.post<{ ok: boolean; game: GameState }>('/v1/snapshots/play', params);
  }

  public appendLogAction(gameId: number, message: string) {
    this.socketService.emit('game:action:appendLog', { gameId, message })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public changeAvatarAction(gameId: number, avatarName: string) {
    this.socketService.emit('game:action:changeAvatar', { gameId, avatarName })
      .subscribe(() => { }, (error: ApiError) => this.handleError(error));
  }

  public forceDisconnect() {
    // Force disconnect from the socket to simulate network issues
    this.socketService.forceDisconnect();

    // Show a toast message to inform the user
    this.alertService.toast(this.translate.instant('FORCE_DISCONNECT_MESSAGE'));
  }

  private startListening(id: number) {
    this.socketService.on(`game[${id}]:join`, (clientId: number) => this.onJoin(id, clientId));
    this.socketService.on(`game[${id}]:leave`, (clientId: number) => this.onLeave(id, clientId));
    this.socketService.on(`game[${id}]:stateChange`, (data: {
      stateData: string;
      playerStats: PlayerStats[];
      isDiff?: boolean;
      viewKey?: string;
      undoEnabled?: boolean;
      deepUndoEnabled?: boolean;
      canUndo?: boolean;
      undoOwnerId?: number;
    }) => this.onStateChange(id, data.stateData, data.playerStats, data.isDiff, data.viewKey, {
      undoEnabled: data.undoEnabled,
      deepUndoEnabled: data.deepUndoEnabled,
      canUndo: data.canUndo,
      undoOwnerId: data.undoOwnerId,
    }));
    this.socketService.on(`game[${id}]:timerUpdate`, (data: { playerStats: PlayerStats[] }) =>
      this.onTimerUpdate(id, data.playerStats));

    // Animation event handlers
    this.socketService.on(`game[${id}]:playBasicAnimation`, (data: { playerId: number, cardId: number | string, slot: string, index?: number }) => {
      this.boardInteractionService.triggerBasicAnimation(data);
    });
    this.socketService.on(`game[${id}]:evolution`, (data: { playerId: number, cardId: number | string, slot: string, index?: number }) => {
      this.boardInteractionService.triggerEvolutionAnimation(data);
    });
    this.socketService.on(`game[${id}]:attack`, (data: { playerId: number, cardId: number | string, slot: string, index?: number, cardType?: CardType, opponentId?: number }) => {
      this.boardInteractionService.triggerAttackAnimation(data);
      
      // Trigger sound and visual effects if cardType is provided
      if (data.cardType !== undefined && data.opponentId !== undefined) {
        // Play attack sound
        this.soundService.playAttackSound(data.cardType);
        
        // Determine opponent's PlayerType from game state
        let opponentPlayerType: PlayerType | undefined;
        const gameState = this.sessionService.session.gameStates.find(g => g.gameId === id && !g.deleted);
        if (gameState && gameState.state) {
          const state = gameState.state;
          // Find which player is the opponent
          const opponent = state.players.find(p => p.id === data.opponentId);
          const attackingPlayer = state.players.find(p => p.id === data.playerId);
          if (opponent && attackingPlayer) {
            // Determine PlayerType based on player order in state.players array
            // First player is typically BOTTOM_PLAYER, second is TOP_PLAYER
            // But this can vary, so we use a more reliable method
            const opponentIndex = state.players.indexOf(opponent);
            opponentPlayerType = opponentIndex === 0 ? PlayerType.BOTTOM_PLAYER : PlayerType.TOP_PLAYER;
          }
        }
        
        // Trigger visual effect on opponent's card
        this.boardInteractionService.triggerAttackEffect({
          playerId: data.playerId,
          cardId: data.cardId,
          slot: data.slot,
          index: data.index,
          cardType: data.cardType,
          opponentId: data.opponentId,
          opponentPlayerType: opponentPlayerType
        });
      }
    });
    this.socketService.on(`game[${id}]:coinFlip`, (data: { playerId: number, result: boolean }) => {
      this.boardInteractionService.triggerCoinFlipAnimation(data.result, data.playerId);
    });
    this.socketService.on(`game[${id}]:attachEnergy`, () => {
      this.soundService.playEnergyAttachSound();
    });
  }

  private stopListening(id: number) {
    this.socketService.off(`game[${id}]:join`);
    this.socketService.off(`game[${id}]:leave`);
    this.socketService.off(`game[${id}]:stateChange`);
    this.socketService.off(`game[${id}]:timerUpdate`);

    // Clean up animation event handlers
    this.socketService.off(`game[${id}]:playBasicAnimation`);
    this.socketService.off(`game[${id}]:evolution`);
    this.socketService.off(`game[${id}]:attack`);
    this.socketService.off(`game[${id}]:coinFlip`);
    this.socketService.off(`game[${id}]:attachEnergy`);
  }

  private onStateChange(
    gameId: number,
    stateData: string,
    playerStats: PlayerStats[],
    isDiff?: boolean,
    viewKey?: string,
    extras?: {
      undoEnabled?: boolean;
      deepUndoEnabled?: boolean;
      canUndo?: boolean;
      undoOwnerId?: number;
    }
  ) {
    const games = this.sessionService.session.gameStates;
    // Prefer the active table, but still accept updates after core:deleteGame marked it deleted
    // (FINISHED often arrives in the same tick as deleteGame).
    let index = games.findIndex(g => g.gameId === gameId && g.deleted === false);
    if (index === -1) {
      index = games.findIndex(g => g.gameId === gameId);
    }
    if (index !== -1) {
      const gameStates = this.sessionService.session.gameStates.slice();
      const prev = gameStates[index];

      // Diffs are only valid against the same sanitized view (self-play focus / seat).
      if (isDiff && viewKey && prev.viewKey && viewKey !== prev.viewKey) {
        return;
      }

      const decoded = this.decodeStateData(stateData, {
        isDiff: isDiff === true,
        base: prev.serializedBase,
      });
      if (!decoded) {
        return;
      }

      // Server sends full log history with shared views; replace rather than append.
      const logs = [...decoded.state.logs];

      // Extract enhanced player statistics if available from the state
      const enhancedPlayerStats = this.extractPlayerGameStats(decoded.state);

      gameStates[index] = {
        ...prev,
        state: decoded.state,
        logs,
        enhancedPlayerStats: enhancedPlayerStats,
        playerStats,
        serializedBase: decoded.serializedBase,
        viewKey: viewKey ?? prev.viewKey,
        undoEnabled: extras?.undoEnabled ?? prev.undoEnabled,
        deepUndoEnabled: extras?.deepUndoEnabled ?? prev.deepUndoEnabled,
        canUndo: extras?.canUndo ?? prev.canUndo,
        undoOwnerId: extras?.undoOwnerId ?? prev.undoOwnerId,
      };
      this.sessionService.set({ gameStates });
      this.boardInteractionService.updateGameLogs(logs);

      // Clear game ID for reconnection tracking if game has finished
      if (decoded.state.phase === GamePhase.FINISHED) {
        this.socketService.clearGameId();
      }
    }
  }



  private extractPlayerGameStats(state: State): PlayerGameStats[] | undefined {
    // For now, return undefined as the server-side statistics tracking is not yet implemented
    // This method will be updated when the server-side GameStatsTracker is implemented
    // The method provides type safety and proper structure for when the data becomes available

    if (!state || !state.players) {
      return undefined;
    }

    try {
      // Check if enhanced game statistics are available in the state
      // This will be populated by the server-side GameStatsTracker in future tasks
      const playerStats: PlayerGameStats[] = state.players.map((player, index) => {
        // Extract game statistics if available, otherwise use defaults
        const gameStats = (player as any).gameStats;

        if (gameStats && isValidPlayerGameStats(gameStats)) {
          return {
            prizesTakenCount: gameStats.prizesTakenCount,
            totalDamageDealt: gameStats.totalDamageDealt,
            topPokemon: gameStats.topPokemon
          };
        }

        // Fallback to default values when server-side tracking is not available
        return {
          prizesTakenCount: 0,
          totalDamageDealt: 0,
          topPokemon: null
        };
      });

      return playerStats;
    } catch (error) {
      return undefined;
    }
  }

  private onJoin(gameId: number, clientId: number) {
    const games = this.sessionService.session.gameStates;
    const index = games.findIndex(g => g.gameId === gameId && g.deleted === false);
    if (index === -1) {
      return;
    }
    const game = this.sessionService.session.gameStates[index];
    const clientIndex = game.clientIds.indexOf(clientId);
    if (clientIndex === -1) {
      const clientIds = [...game.clientIds, clientId];
      const gameStates = this.sessionService.session.gameStates.slice();
      gameStates[index] = { ...gameStates[index], clientIds };
      this.sessionService.set({ gameStates });
    }
  }

  private onLeave(gameId: number, clientId: number) {
    const games = this.sessionService.session.gameStates;
    const index = games.findIndex(g => g.gameId === gameId && g.deleted === false);
    if (index === -1) {
      return;
    }
    const game = this.sessionService.session.gameStates[index];
    const clientIndex = game.clientIds.indexOf(clientId);
    if (clientIndex !== -1) {
      const clientIds = game.clientIds.filter(id => id !== clientId);
      const gameStates = this.sessionService.session.gameStates.slice();
      gameStates[index] = { ...gameStates[index], clientIds };
      this.sessionService.set({ gameStates });
    }
  }

  private onTimerUpdate(gameId: number, playerStats: PlayerStats[]) {
    const games = this.sessionService.session.gameStates;
    const index = games.findIndex(g => g.gameId === gameId && g.deleted === false);
    if (index !== -1) {
      const gameStates = this.sessionService.session.gameStates.slice();
      gameStates[index] = { ...gameStates[index], playerStats };
      this.sessionService.set({ gameStates });
    }
  }

  private decodeStateData(
    stateData: string,
    options: { isDiff?: boolean; base?: string } = {}
  ): { state: State; serializedBase: string } | null {
    const base64 = new Base64();
    const encoded = base64.decode(stateData);
    const serializer = new StateSerializer();

    let looksLikeDiff = false;
    try {
      const parsed = JSON.parse(encoded);
      looksLikeDiff = Array.isArray(parsed) && parsed.length === 1;
    } catch {
      looksLikeDiff = false;
    }

    const treatAsDiff = options.isDiff === true || looksLikeDiff;
    if (treatAsDiff) {
      if (!options.base) {
        return null;
      }
      try {
        const serializedBase = serializer.applyDiff(options.base, encoded);
        const state = serializer.deserialize(serializedBase);
        if (!this.isPlausibleGameState(state)) {
          return null;
        }
        return { state, serializedBase };
      } catch {
        return null;
      }
    }

    try {
      const state = serializer.deserialize(encoded);
      if (!this.isPlausibleGameState(state)) {
        return null;
      }
      return { state, serializedBase: encoded };
    } catch {
      return null;
    }
  }

  private isPlausibleGameState(state: State): boolean {
    if (!state || !Array.isArray(state.players) || state.players.length < 1) {
      return false;
    }
    return state.players.every(p =>
      !!p
      && !!p.hand
      && Array.isArray(p.hand.cards)
      && Array.isArray(p.bench)
      && !!p.deck
      && Array.isArray(p.prizes)
    );
  }

  private handleError(error: ApiError): void {
    const message = String(error.message);
    console.error('Game socket error:', message, error);
    const translations = this.translate.translations[this.translate.currentLang]
      || this.translate.translations[this.translate.defaultLang];

    const key = translations && translations.GAME_MESSAGES[message]
      ? 'GAME_MESSAGES.' + message
      : 'ERROR_UNKNOWN';

    this.alertService.toast(this.translate.instant(key));
  }

}