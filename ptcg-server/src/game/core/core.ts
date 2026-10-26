import { AddPlayerAction } from '../store/actions/add-player-action';
import { CleanerTask } from '../tasks/cleaner-task';
import { Client } from '../client/client.interface';
import { GameError } from '../game-error';
import { GameMessage, GameCoreError } from '../game-message';
import { Game } from './game';
import { GameSettings, coerceGameSettings } from './game-settings';
import { InvitePlayerAction } from '../store/actions/invite-player-action';
import { Messager } from './messager';
import { RankingCalculator } from './ranking-calculator';
import { Scheduler, generateId } from '../../utils';
import { config } from '../../config';
import { FormatManager } from '../format/format-manager';
import { AbortGameAction } from '../store/actions/abort-game-action';
import { AbortGameReason } from '../store/actions/abort-game-action';
import { GamePhase } from '../store/state/state';
import { BotManager } from '../bots/bot-manager';
import { ReconnectionManager } from '../../backend/services/reconnection-manager';
import { ReconnectionConfig } from '../../backend/interfaces/reconnection.interface';
import { logger } from '../../utils/logger';
import { User } from '../../storage';

function applyFormatRuleOverrides(gameSettings: GameSettings): void {
  const format = FormatManager.getInstance().getFormatById(gameSettings.format);
  Object.assign(gameSettings.rules, format?.ruleOverrides);
}

export class Core {
  public clients: Client[] = [];
  public games: Game[] = [];
  public messager: Messager;
  private botManager: BotManager;
  private reconnectionManager: ReconnectionManager;
  private inactiveCleanupIntervalRef: NodeJS.Timeout | undefined;

  constructor(reconnectionConfig?: ReconnectionConfig) {
    this.messager = new Messager(this);
    this.botManager = BotManager.getInstance();

    const defaultConfig: ReconnectionConfig = {
      preservationTimeoutMs: 5 * 60 * 1000,
      maxAutoReconnectAttempts: 3,
      reconnectIntervals: [5000, 10000, 15000],
      healthCheckIntervalMs: 30 * 1000,
      cleanupIntervalMs: 60 * 1000,
      maxPreservedSessionsPerUser: 1,
      disconnectForfeitMs: 60 * 1000
    };
    this.reconnectionManager = new ReconnectionManager(reconnectionConfig || defaultConfig);

    const cleanerTask = new CleanerTask(this);
    cleanerTask.startTasks();
    this.startRankingDecrease();
    this.startInactiveGameCleanup();
  }

  public getBotManager(): BotManager {
    return this.botManager;
  }

  public getReconnectionManager(): ReconnectionManager {
    return this.reconnectionManager;
  }

  /**
   * Returns the game id the user can rejoin if they have a disconnected slot (for core:getInfo).
   */
  public getReconnectableGameId(userId: number): number | undefined {
    for (const game of this.games) {
      const playerId = game.getPlayerIdForUser(userId);
      if (playerId !== undefined && game.isPlayerDisconnected(playerId) && game.state.phase !== GamePhase.FINISHED) {
        return game.id;
      }
    }
    return undefined;
  }

  public async connect(client: Client): Promise<Client> {
    if (client.id === 0 || this.clients.some(c => c.id === client.id)) {
      client.id = generateId(this.clients);
    }
    client.core = this;
    client.games = [];

    // Add client to the core
    this.clients.push(client);

    // Emit connection events to notify other clients
    this.emit(c => c.onConnect(client));

    // Send updated user list to all clients to show the new user as online
    this.broadcastUserUpdates();

    return client;
  }

  public async disconnect(client: Client, reason: string = 'unknown'): Promise<void> {
    const index = this.clients.indexOf(client);
    if (index === -1) {
      throw new GameError(GameMessage.ERROR_CLIENT_NOT_CONNECTED);
    }

    // Handle disconnection for all games without removing them
    client.games.forEach(game => {
      const isPlayer = game.state.players.some(player => player.id === client.id);
      if (isPlayer) {
        game.handlePlayerDisconnection(client);
        return;
      }

      const gameClientIndex = game.clients.indexOf(client);
      if (gameClientIndex !== -1) {
        game.clients.splice(gameClientIndex, 1);
        this.emit(c => c.onGameLeave(game, client));
      }
    });
    client.games = [];

    // Remove client from core
    this.clients.splice(index, 1);
    client.core = undefined;

    // Notify other clients
    this.emit(c => c.onDisconnect(client));

    // Send updated user list to all clients to show the user as offline
    this.broadcastUserUpdates();
  }

  public createGame(
    client: Client,
    deck: string[],
    gameSettings: GameSettings = new GameSettings(),
    invited?: Client,
    deckId1?: number,
    deckId2?: number,
    sleeveImagePath1?: string,
    deckBoxImagePath1?: string,
    coinImagePath1?: string
  ): Game {
    gameSettings = coerceGameSettings(gameSettings);
    if (this.clients.indexOf(client) === -1) {
      throw new GameError(GameMessage.ERROR_CLIENT_NOT_CONNECTED);
    }
    if (invited && this.clients.indexOf(invited) === -1) {
      throw new GameError(GameMessage.ERROR_CLIENT_NOT_CONNECTED);
    }

    // Check if either client is a bot with format restrictions
    if (invited && this.isBotClient(invited)) {
      const botClient = invited as any; // Cast to access bot-specific methods
      if (!botClient.isFormatAllowed(gameSettings.format)) {
        throw new GameError(GameCoreError.ERROR_BOT_FORMAT_NOT_ALLOWED);
      }
    }

    if (this.isBotClient(client)) {
      const botClient = client as any; // Cast to access bot-specific methods
      if (!botClient.isFormatAllowed(gameSettings.format)) {
        throw new GameError(GameCoreError.ERROR_BOT_FORMAT_NOT_ALLOWED);
      }
    }
    applyFormatRuleOverrides(gameSettings);
    const game = new Game(this, generateId(this.games), gameSettings);
    this.games.push(game);
    game.dispatch(client, new AddPlayerAction(client.id, client.name, deck, undefined, deckId1, sleeveImagePath1, deckBoxImagePath1, coinImagePath1));
    if (invited) {
      game.dispatch(client, new InvitePlayerAction(invited.id, invited.name));
    }
    if (this.games.indexOf(game) !== -1) {
      this.emit(c => c.onGameAdd(game));
      this.joinGame(client, game);
      if (invited) {
        this.joinGame(invited, game);
      }
    }
    return game;
  }

  public createSelfPlayGame(
    client: Client,
    deck1: string[],
    deck2: string[],
    gameSettings: GameSettings = new GameSettings(),
    deckId1?: number,
    deckId2?: number,
    sleeveImagePath1?: string,
    sleeveImagePath2?: string,
    deckBoxImagePath1?: string,
    deckBoxImagePath2?: string,
    coinImagePath1?: string,
    coinImagePath2?: string
  ): Game {
    gameSettings = coerceGameSettings(gameSettings);
    if (this.clients.indexOf(client) === -1) {
      throw new GameError(GameMessage.ERROR_CLIENT_NOT_CONNECTED);
    }

    if (this.isBotClient(client)) {
      const botClient = client as any;
      if (!botClient.isFormatAllowed(gameSettings.format)) {
        throw new GameError(GameCoreError.ERROR_BOT_FORMAT_NOT_ALLOWED);
      }
    }

    gameSettings.selfPlay = true;

    applyFormatRuleOverrides(gameSettings);

    const taken = new Set(this.clients.map(c => c.id));
    let opponentId = generateId(this.clients);
    while (taken.has(opponentId) || opponentId === client.id) {
      opponentId += 1;
    }

    const game = new Game(this, generateId(this.games), gameSettings);
    this.games.push(game);
    game.dispatch(client, new AddPlayerAction(client.id, client.name, deck1, undefined, deckId1, sleeveImagePath1, deckBoxImagePath1, coinImagePath1));
    game.dispatch(
      client,
      new AddPlayerAction(opponentId, `${client.name} (2)`, deck2, undefined, deckId2, sleeveImagePath2, deckBoxImagePath2, coinImagePath2)
    );
    game.initSelfPlay(client.user.id);

    if (this.games.indexOf(game) !== -1) {
      this.emit(c => c.onGameAdd(game));
      this.joinGame(client, game);
    }
    return game;
  }

  public createGameWithDecks(
    client: Client,
    deck: string[],
    gameSettings: GameSettings = new GameSettings(),
    client2: Client,
    deck2: string[],
    artworksMap1?: { [code: string]: { imageUrl: string; holoType?: string } },
    artworksMap2?: { [code: string]: { imageUrl: string; holoType?: string } },
    deckId1?: number,
    deckId2?: number,
    sleeveImagePath1?: string,
    sleeveImagePath2?: string,
    deckBoxImagePath1?: string,
    deckBoxImagePath2?: string,
    coinImagePath1?: string,
    coinImagePath2?: string
  ): Game {
    gameSettings = coerceGameSettings(gameSettings);
    if (this.clients.indexOf(client) === -1) {
      throw new GameError(GameMessage.ERROR_CLIENT_NOT_CONNECTED);
    }
    if (this.clients.indexOf(client2) === -1) {
      throw new GameError(GameMessage.ERROR_CLIENT_NOT_CONNECTED);
    }

    console.log(`[Matchmaking] Match created between ${client.name} and ${client2.name} (Format: ${gameSettings.format})`);
    applyFormatRuleOverrides(gameSettings);
    const game = new Game(this, generateId(this.games), gameSettings);
    this.games.push(game);
    game.dispatch(client, new AddPlayerAction(client.id, client.name, deck, artworksMap1, deckId1, sleeveImagePath1, deckBoxImagePath1, coinImagePath1));
    game.dispatch(client, new AddPlayerAction(client2.id, client2.name, deck2, artworksMap2, deckId2, sleeveImagePath2, deckBoxImagePath2, coinImagePath2));
    if (this.games.indexOf(game) !== -1) {
      this.emit(c => c.onGameAdd(game));
      this.joinGame(client, game);
      this.joinGame(client2, game);
    }
    return game;
  }

  public joinGame(client: Client, game: Game): void {
    if (this.clients.indexOf(client) === -1) {
      throw new GameError(GameMessage.ERROR_CLIENT_NOT_CONNECTED);
    }
    if (this.games.indexOf(game) === -1) {
      throw new GameError(GameMessage.ERROR_GAME_NOT_FOUND);
    }
    if (client.games.indexOf(game) === -1) {
      this.emit(c => c.onGameJoin(game, client));
      client.games.push(game);
      game.clients.push(client);
      game.registerPlayer(client);
    }
  }

  public deleteGame(game: Game): void {
    game.clients.forEach(client => {
      const index = client.games.indexOf(game);
      if (index !== -1) {
        client.games.splice(index, 1);
        this.emit(c => c.onGameLeave(game, client));
      }
    });
    const index = this.games.indexOf(game);
    if (index !== -1) {
      this.games.splice(index, 1);
      this.emit(c => c.onGameDelete(game));
    }
  }

  public leaveGame(client: Client, game: Game): void {
    if (this.clients.indexOf(client) === -1) {
      throw new GameError(GameMessage.ERROR_CLIENT_NOT_CONNECTED);
    }
    if (this.games.indexOf(game) === -1) {
      throw new GameError(GameMessage.ERROR_GAME_NOT_FOUND);
    }
    const gameIndex = client.games.indexOf(game);
    const clientIndex = game.clients.indexOf(client);
    if (clientIndex !== -1 && gameIndex !== -1) {
      client.games.splice(gameIndex, 1);
      game.clients.splice(clientIndex, 1);
      this.emit(c => c.onGameLeave(game, client));
      game.handleClientLeave(client);
    }
    if (game.clients.length === 0) {
      this.deleteGame(game);
    }
  }

  public emit(fn: (client: Client) => void): void {
    this.clients.forEach(fn);
  }

  /**
   * Broadcast user updates to all connected clients
   */
  private broadcastUserUpdates(): void {
    // Get all unique users from connected clients
    const userIds = new Set(this.clients.map(c => c.user.id));
    const users = Array.from(userIds).map(userId => {
      const client = this.clients.find(c => c.user.id === userId);
      return client ? client.user : null;
    }).filter((user): user is User => user !== null);

    // Emit user updates to all clients
    this.emit(c => c.onUsersUpdate(users));
  }

  private startRankingDecrease() {
    const scheduler = Scheduler.getInstance();
    const rankingCalculator = new RankingCalculator();
    scheduler.run(async () => {
      let users = await rankingCalculator.decreaseRanking();

      // Notify only about users which are currently connected
      const connectedUserIds = this.clients.map(c => c.user.id);
      users = users.filter(u => connectedUserIds.includes(u.id));

      this.emit(c => c.onUsersUpdate(users));
    }, config.core.rankingDecreaseIntervalCount);
  }

  private startInactiveGameCleanup(): void {
    const everyMs = 5 * 60 * 1000;
    const inactiveTimeout = 5 * 60 * 1000;

    void this.runGameCleanupPass(inactiveTimeout);

    this.inactiveCleanupIntervalRef = setInterval(() => {
      void this.runGameCleanupPass(inactiveTimeout);
    }, everyMs);
  }

  private shouldRemoveStaleGame(game: Game, inactiveTimeout: number): boolean {
    const state = game.state;
    if (state.phase === GamePhase.FINISHED) {
      return true;
    }
    if (state.players.length === 0) {
      return true;
    }
    return game.isInactive(inactiveTimeout);
  }

  private async runGameCleanupPass(inactiveTimeout: number): Promise<void> {
    for (const game of [...this.games]) {
      if (!this.shouldRemoveStaleGame(game, inactiveTimeout)) {
        continue;
      }
      await this.forceRemoveGame(game);
    }
  }

  private async forceRemoveGame(game: Game): Promise<void> {
    if (this.games.indexOf(game) === -1) {
      return;
    }

    if (game.clients.length === 0) {
      try {
        const activeSessions = await this.reconnectionManager.getActiveDisconnectedSessions();
        const gameHasPreservedSessions = activeSessions.some(session => session.gameId === game.id);
        if (gameHasPreservedSessions) {
          console.log(`[Game Cleanup] Skipping cleanup of game ${game.id} - has preserved sessions`);
          return;
        }
      } catch (error) {
        console.log(`[Game Cleanup] Error checking preserved sessions for game ${game.id}: ${error}`);
        return;
      }
    }

    console.log(`[Game Cleanup] Cleaning up stale game ${game.id}`);
    const state = game.state;
    if (state.phase !== GamePhase.FINISHED && state.players.length > 0) {
      for (const player of state.players) {
        const action = new AbortGameAction(player.id, AbortGameReason.DISCONNECTED);
        if (game.clients.length > 0) {
          game.dispatch(game.clients[0], action);
        } else {
          game.getStore().dispatch(action);
        }
      }
    }
    game.cleanup();
    this.deleteGame(game);
  }

  /**
   * Dispose of the Core and cleanup resources
   */
  public dispose(): void {
    if (this.inactiveCleanupIntervalRef !== undefined) {
      clearInterval(this.inactiveCleanupIntervalRef);
      this.inactiveCleanupIntervalRef = undefined;
    }
    if (this.reconnectionManager) {
      this.reconnectionManager.dispose();
    }
    logger.log('[Core] Disposed');
  }

  private isBotClient(client: Client): boolean {
    // Check if the client has bot-specific methods
    return 'isFormatAllowed' in client && 'getAllowedFormats' in client;
  }

}