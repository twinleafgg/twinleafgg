import { json } from 'body-parser';
import * as express from 'express';

import { config } from '../config';
import { BotManager } from '../game/bots/bot-manager';
import { Core } from '../game/core/core';
import { Storage } from '../storage';
import { cors } from './services/cors';
import { WebSocketServer } from './socket/websocket-server';
import { MemoryOptimizationService } from './services/memory-optimization.service';

import {
  Avatars,
  Cards,
  ControllerClass,
  Decks,
  Favorites,
  Friends,
  Game,
  Images,
  Login,
  Messages,
  Profile,
  Ranking,
  Replays,
  Snapshots,
  ResetPassword,
  BattlePass,
  Sleeves,
  DeckBoxes,
  Coins,
  MemoryHealthController,
  AdminBattlePass,
  AdminAvatars,
  AdminSleeves,
  AdminDeckBoxes,
  AdminCoins,
} from './controllers';
import { ApiErrorEnum } from './common/errors';

export class App {

  private app: express.Application;
  private ws: WebSocketServer;
  private storage: Storage;
  private core: Core = new Core();
  private memoryOptimization: MemoryOptimizationService;

  constructor() {
    this.storage = new Storage();
    this.app = this.configureExpress();
    this.ws = this.configureWebSocket();
    this.memoryOptimization = MemoryOptimizationService.getInstance();
  }

  private configureExpress(): express.Application {
    const storage = this.storage;
    const core = this.core;
    const app = express();

    const define = function (path: string, controller: ControllerClass): void {
      const instance = new controller(path, app, storage, core);
      instance.init();
    };

    // General limit: base + avatar size (4x) + replay size (4x for base64 encoding overhead).
    // /v1/replays uses a higher limit so long-game replay imports are not rejected at the parser.
    const defaultJsonLimit = 512 + config.backend.avatarFileSize * 4 + config.backend.replayFileSize * 4;
    const parseJsonDefault = json({ limit: defaultJsonLimit });
    const parseJsonReplays = json({ limit: config.backend.replayImportJsonBodyLimit });
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.path.startsWith('/v1/replays') || req.path.startsWith('/v1/snapshots')) {
        return parseJsonReplays(req, res, next);
      }
      return parseJsonDefault(req, res, next);
    });
    app.use(cors());

    // Health check endpoint - must be first route
    app.get('/health', async (req, res) => {
      try {
        // Check database connection
        const dbStatus = await storage.checkConnection();
        res.status(200).json({
          status: 'ok',
          database: dbStatus ? 'connected' : 'disconnected',
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          status: 'error',
          database: 'error',
          error: error?.message || 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Static files
    if (config.sets.scansDir) {
      app.use('/scans', express.static(config.sets.scansDir));
    }
    app.use('/avatars', express.static(config.backend.avatarsDir));
    app.use('/sleeves', express.static(config.backend.sleevesDir));
    app.use('/deck-boxes', express.static(config.backend.deckBoxesDir));
    app.use('/coins', express.static(config.backend.coinsDir));

    // API routes
    define('/v1/avatars', Avatars);
    define('/v1/cards', Cards);
    define('/v1/decks', Decks);
    define('/v1/favorites', Favorites);
    define('/v1/friends', Friends);
    define('/v1/game', Game);
    define('/v1/images', Images);
    define('/v1/login', Login);
    define('/v1/messages', Messages);
    define('/v1/profile', Profile);
    define('/v1/ranking', Ranking);
    define('/v1/replays', Replays);
    define('/v1/snapshots', Snapshots);
    define('/v1/resetPassword', ResetPassword);
    define('/v1/battlepass', BattlePass);
    define('/v1/sleeves', Sleeves);
    define('/v1/deck-boxes', DeckBoxes);
    define('/v1/coins', Coins);
    define('/v1/admin/battlepass', AdminBattlePass);
    define('/v1/admin/avatars', AdminAvatars);
    define('/v1/admin/sleeves', AdminSleeves);
    define('/v1/admin/deck-boxes', AdminDeckBoxes);
    define('/v1/admin/coins', AdminCoins);
    define('/v1/memory', MemoryHealthController);

    app.use((err: any, req: any, res: any, next: any) => {
      // Handle request aborted errors
      if (err && (
        (err.type === 'request.aborted') ||
        (err.code === 'ECONNRESET') ||
        (err.status === 400 && err.message === 'request aborted')
      )) {
        return;
      }

      // Handle payload too large errors
      if (err && (
        err.status === 413 ||
        err.statusCode === 413 ||
        err.type === 'entity.too.large' ||
        (err.message && err.message.includes('too large'))
      )) {
        const path = typeof req.originalUrl === 'string'
          ? req.originalUrl.split('?')[0]
          : req.path;
        const contentLength = req.get('content-length');
        const userId = typeof req.body?.userId === 'number' ? req.body.userId : undefined;
        console.error('[HTTP Error] PayloadTooLargeError:', err.message, {
          method: req.method,
          path,
          contentLength: contentLength ?? 'unknown',
          ...(userId !== undefined ? { userId } : {}),
        });
        if (!res.headersSent) {
          res.status(413).json({ error: ApiErrorEnum.PAYLOAD_TOO_LARGE });
        }
        return;
      }

      // Log other errors
      console.error('[HTTP Error]', err.stack);

      // Only send response if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).send('Something broke!');
      }
    });

    return app;
  }

  private configureWebSocket(): WebSocketServer {
    const ws = new WebSocketServer(this.core);

    ws.server?.on('error', (error) => {
      console.error(error);
    });

    return ws;
  }

  public async connectToDatabase(): Promise<void> {
    await this.storage.connect();
    const { seedBattlePassData } = await import('../storage/battle-pass-seed');
    await seedBattlePassData();
    const { seedDefaultDeckBoxes } = await import('../storage/deck-box-seed');
    await seedDefaultDeckBoxes();
    const { seedDefaultCoins } = await import('../storage/coin-seed');
    await seedDefaultCoins();
  }

  public configureBotManager(botManager: BotManager): void {
    botManager.initBots(this.core);
  }

  public start(): void {
    const address = config.backend.address;
    const port = config.backend.port;

    const httpServer = this.app.listen(port, address, () => {
      console.log(`Server listening on ${address}:${port}.`);
    });

    this.ws.listen(httpServer);

    // Start memory optimization service
    this.memoryOptimization.start();

    console.log('Memory optimization service started.');
  }

}
