import { Request, Response } from 'express';
import { LessThan } from 'typeorm';

import { AuthToken } from '../services';
import { Controller, Get, Post } from './controller';
import { ApiErrorEnum } from '../common/errors';
import { GameSnapshot, Match, Replay, User } from '../../storage';
import { Replay as GameReplay, StateSerializer } from '../../game';
import {
  buildSnapshotPayload,
  compressSnapshotPayload,
  decompressSnapshotPayload,
  generateSnapshotCode,
  SNAPSHOT_TTL_MS,
} from '../../game/core/game-snapshot';
import { Base64 } from '../../utils';
import { config } from '../../config';
import { CoreSocket } from '../socket/core-socket';

export class Snapshots extends Controller {

  @Post('/create')
  @AuthToken()
  public async onCreate(req: Request, res: Response) {
    const userId: number = req.body.userId;
    const body: {
      gameId?: number;
      matchId?: number;
      replayId?: number;
      position?: number;
      stateData?: string;
    } = req.body;

    const user = await User.findOne(userId);
    if (user === undefined) {
      res.status(400);
      res.send({ error: ApiErrorEnum.PROFILE_INVALID });
      return;
    }

    try {
      await this.purgeExpired();

      let payload;
      if (typeof body.gameId === 'number') {
        const game = this.core.games.find(g => g.id === body.gameId);
        if (!game) {
          res.status(400);
          res.send({ error: ApiErrorEnum.GAME_INVALID_ID });
          return;
        }
        const client = this.core.clients.find(c => c.user.id === userId);
        const seated = !!client && (
          game.state.players.some(p => p.id === client.id)
          || game.isSelfPlayForUser(userId)
          || game.getPlayerUserIds().includes(userId)
        );
        if (!seated) {
          res.status(400);
          res.send({ error: ApiErrorEnum.ACTION_INVALID });
          return;
        }
        payload = buildSnapshotPayload(game.state);
      } else if (typeof body.matchId === 'number') {
        const match = await Match.findOne(body.matchId);
        if (!match) {
          res.status(400);
          res.send({ error: ApiErrorEnum.GAME_INVALID_ID });
          return;
        }
        const replay = new GameReplay({ indexEnabled: true });
        replay.deserialize(match.replayData);
        const pos = typeof body.position === 'number' ? body.position : replay.getStateCount() - 1;
        payload = buildSnapshotPayload(replay.getState(pos));
      } else if (typeof body.replayId === 'number') {
        const entity = await Replay.findOne(body.replayId, { relations: ['user'] });
        if (!entity || entity.user.id !== userId) {
          res.status(400);
          res.send({ error: ApiErrorEnum.REPLAY_INVALID });
          return;
        }
        const replay = new GameReplay({ indexEnabled: true });
        replay.deserialize(entity.replayData);
        const pos = typeof body.position === 'number' ? body.position : replay.getStateCount() - 1;
        payload = buildSnapshotPayload(replay.getState(pos));
      } else if (typeof body.stateData === 'string') {
        const base64 = new Base64();
        const raw = body.stateData.length > 32 && !body.stateData.includes('[')
          ? base64.decode(body.stateData)
          : body.stateData;
        // Accept either compressed snapshot blob or raw serialized state
        try {
          payload = decompressSnapshotPayload(raw);
        } catch {
          const serializer = new StateSerializer();
          const state = serializer.deserialize(raw);
          payload = buildSnapshotPayload(state);
        }
      } else {
        res.status(400);
        res.send({ error: ApiErrorEnum.VALIDATION_INVALID_PARAM });
        return;
      }

      const snapshotData = compressSnapshotPayload(payload);
      if (snapshotData.length > config.backend.replayFileSize * 4) {
        res.status(400);
        res.send({ error: ApiErrorEnum.PAYLOAD_TOO_LARGE });
        return;
      }

      let code = generateSnapshotCode();
      for (let attempt = 0; attempt < 8; attempt++) {
        const existing = await GameSnapshot.findOne({ where: { code } });
        if (!existing) {
          break;
        }
        code = generateSnapshotCode();
      }

      const entity = new GameSnapshot();
      entity.code = code;
      entity.user = user;
      entity.userId = user.id;
      entity.player1Name = payload.player1Name;
      entity.player2Name = payload.player2Name;
      entity.format = payload.format;
      entity.turn = payload.turn;
      entity.created = Date.now();
      entity.expiresAt = Date.now() + SNAPSHOT_TTL_MS;
      entity.snapshotData = snapshotData;
      await entity.save();

      const base64 = new Base64();
      res.send({
        ok: true,
        code: entity.code,
        snapshotData: base64.encode(snapshotData),
        meta: {
          player1Name: entity.player1Name,
          player2Name: entity.player2Name,
          format: entity.format,
          turn: entity.turn,
          created: entity.created,
          expiresAt: entity.expiresAt,
        },
      });
    } catch (error) {
      console.error('Snapshot create failed:', error);
      res.status(400);
      res.send({ error: ApiErrorEnum.SERVER_ERROR });
    }
  }

  @Get('/:code')
  @AuthToken()
  public async onGet(req: Request, res: Response) {
    const code = String(req.params.code || '').toUpperCase();
    await this.purgeExpired();
    const entity = await GameSnapshot.findOne({ where: { code } });
    if (!entity || entity.expiresAt < Date.now()) {
      res.status(400);
      res.send({ error: ApiErrorEnum.REPLAY_INVALID });
      return;
    }

    const base64 = new Base64();
    res.send({
      ok: true,
      code: entity.code,
      snapshotData: base64.encode(entity.snapshotData),
      meta: {
        player1Name: entity.player1Name,
        player2Name: entity.player2Name,
        format: entity.format,
        turn: entity.turn,
        created: entity.created,
        expiresAt: entity.expiresAt,
      },
    });
  }

  @Post('/play')
  @AuthToken()
  public async onPlay(req: Request, res: Response) {
    const userId: number = req.body.userId;
    const body: { code?: string; snapshotData?: string } = req.body;
    const client = this.core.clients.find(c => c.user.id === userId);
    if (!client) {
      res.status(400);
      res.send({ error: ApiErrorEnum.SOCKET_ERROR });
      return;
    }

    try {
      await this.purgeExpired();
      let compressed: string | undefined;
      if (body.code) {
        const entity = await GameSnapshot.findOne({ where: { code: String(body.code).toUpperCase() } });
        if (!entity || entity.expiresAt < Date.now()) {
          res.status(400);
          res.send({ error: ApiErrorEnum.REPLAY_INVALID });
          return;
        }
        compressed = entity.snapshotData;
      } else if (body.snapshotData) {
        const base64 = new Base64();
        compressed = base64.decode(body.snapshotData);
      } else {
        res.status(400);
        res.send({ error: ApiErrorEnum.VALIDATION_INVALID_PARAM });
        return;
      }

      const payload = decompressSnapshotPayload(compressed);
      const game = this.core.createSelfPlayFromState(client, payload);
      res.send({ ok: true, game: CoreSocket.buildGameState(game, client) });
    } catch (error) {
      console.error('Snapshot play failed:', error);
      res.status(400);
      res.send({ error: ApiErrorEnum.SERVER_ERROR });
    }
  }

  private async purgeExpired(): Promise<void> {
    try {
      await GameSnapshot.delete({ expiresAt: LessThan(Date.now()) });
    } catch {
      // ignore cleanup failures
    }
  }
}
