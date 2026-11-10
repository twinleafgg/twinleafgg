import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { Base64, Replay, GameState, StateSerializer } from 'ptcg-server';

import { ApiService } from '../api.service';
import { GameService } from './game.service';
import { SessionService } from '../../shared/session/session.service';
import { Response } from '../interfaces/response.interface';
import { ReplayDataResponse, ReplayListResponse, ReplayResponse } from '../interfaces/replay.interface';


@Injectable()
export class ReplayService {

  constructor(
    private api: ApiService,
    private gameService: GameService,
    private sessionService: SessionService,
  ) {}

  public getList(page: number = 0, query: string = '') {
    return query === ''
      ? this.api.get<ReplayListResponse>('/v1/replays/list/' + page)
      : this.api.post<ReplayListResponse>('/v1/replays/list/' + page, { query });
  }

  public getMatchReplayData(matchId: number) {
    return this.api.get<ReplayDataResponse>('/v1/replays/match/' + matchId);
  }

  public getMatchReplay(matchId: number) {
    return this.getMatchReplayData(matchId)
      .pipe(map(response => {
        const replay = new Replay();
        const base64 = new Base64();
        replay.deserialize(base64.decode(response.replayData));

        const gameState: GameState = {
          gameId: 0,
          stateData: this.getReplayStateData(replay),
          clientIds: [],
          recordingEnabled: false,
          timeLimit: 0,
          playerStats: []
        };

        const local = this.gameService.appendGameState(gameState, replay);
        if (local) {
          this.attachReplaySource(local.localId, { matchId });
        }
        return local;
      }));
  }

  public getReplayData(replayId: number) {
    return this.api.get<ReplayDataResponse>('/v1/replays/get/' + replayId);
  }

  public getReplay(replayId: number) {
    return this.getReplayData(replayId)
      .pipe(map(response => {
        const replay = new Replay();
        const base64 = new Base64();
        replay.deserialize(base64.decode(response.replayData));

        const gameState: GameState = {
          gameId: 0,
          stateData: this.getReplayStateData(replay),
          clientIds: [],
          recordingEnabled: false,
          timeLimit: 0,
          playerStats: []
        };

        const local = this.gameService.appendGameState(gameState, replay);
        if (local) {
          this.attachReplaySource(local.localId, { replayId });
        }
        return local;
      }));
  }

  private attachReplaySource(localId: number, source: { matchId?: number; replayId?: number }) {
    const games = this.sessionService.session.gameStates;
    const index = games.findIndex(g => g.localId === localId);
    if (index === -1) {
      return;
    }
    const gameStates = games.slice();
    gameStates[index] = { ...gameStates[index], ...source };
    this.sessionService.set({ gameStates });
  }

  public saveMatch(matchId: number, name: string) {
    return this.api.post<ReplayResponse>('/v1/replays/save', { id: matchId, name });
  }

  public deleteReplay(replayId: number) {
    return this.api.post<Response>('/v1/replays/delete', {
      id: replayId
    });
  }

  public rename(replayId: number, name: string) {
    return this.api.post<Response>('/v1/replays/rename', {
      id: replayId,
      name
    });
  }

  public import(replayData: string, name: string) {
    return this.api.post<ReplayResponse>('/v1/replays/import', { replayData, name });
  }

  private getReplayStateData(replay: Replay): string {
    const state = replay.getState(0);
    const serializer = new StateSerializer();
    const serializedState = serializer.serialize(state);
    const base64 = new Base64();
    return base64.encode(serializedState);
  }

}
