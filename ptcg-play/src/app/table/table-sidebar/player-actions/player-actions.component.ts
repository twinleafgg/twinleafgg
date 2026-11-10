import { Component, Output, EventEmitter, Input, OnChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { AlertService } from '../../../shared/alert/alert.service';
import { GameService } from '../../../api/services/game.service';
import { LocalGameState } from '../../../shared/session/session.interface';
import { SessionService } from '../../../shared/session/session.service';
import { ShareStatePopupService } from '../share-state-popup/share-state-popup.service';
import { GamePhase } from 'ptcg-server';


@Component({
  selector: 'ptcg-player-actions',
  templateUrl: './player-actions.component.html',
  styleUrls: ['./player-actions.component.scss']
})
export class PlayerActionsComponent implements OnChanges {

  @Input() gameState: LocalGameState;
  @Input() clientId: number;

  @Output() join = new EventEmitter<void>();

  public isObserver = false;
  public isPlaying = false;
  public isYourTurn = false;
  public isSelfPlay = false;
  public isReplay = false;
  public canShare = false;
  public undoEnabled = false;
  public canUndo = false;

  constructor(
    private alertService: AlertService,
    private gameService: GameService,
    private sessionService: SessionService,
    private shareStatePopupService: ShareStatePopupService,
    private translate: TranslateService
  ) { }

  public async leave() {
    if (!this.gameState || !this.gameState.gameId) {
      return;
    }
    const result = await this.alertService.confirm(
      this.translate.instant('MAIN_LEAVE_GAME')
    );

    if (!result) {
      return;
    }

    if (this.gameState.deleted) {
      this.gameService.removeLocalGameState(this.gameState.localId);
    } else {
      this.gameService.leave(this.gameState.gameId);
    }
  }

  public passTurn() {
    if (!this.gameState || !this.gameState.gameId) {
      return;
    }
    this.gameService.passTurnAction(this.gameState.gameId);
  }

  public undo() {
    if (!this.gameState || !this.gameState.gameId || !this.canUndo) {
      return;
    }
    this.gameService.undoAction(this.gameState.gameId);
  }

  public shareState() {
    if (!this.gameState || !this.canShare) {
      return;
    }

    if (this.gameState.replay) {
      if (typeof this.gameState.matchId === 'number') {
        this.shareStatePopupService.openDialog({
          matchId: this.gameState.matchId,
          position: Math.max(0, (this.gameState.replayPosition || 1) - 1),
        });
        return;
      }
      if (typeof this.gameState.replayId === 'number') {
        this.shareStatePopupService.openDialog({
          replayId: this.gameState.replayId,
          position: Math.max(0, (this.gameState.replayPosition || 1) - 1),
        });
        return;
      }
      return;
    }

    if (!this.gameState.gameId || this.gameState.deleted) {
      return;
    }

    this.shareStatePopupService.openDialog({
      gameId: this.gameState.gameId,
    });
  }

  public switchSides() {
    if (!this.gameState || this.gameState.state?.gameSettings?.selfPlay === true) {
      return;
    }
    const games = this.sessionService.session.gameStates;
    const index = games.findIndex(g => g.localId === this.gameState.localId);
    if (index === -1) {
      return;
    }
    const gameStates = this.sessionService.session.gameStates.slice();
    const switchSide = !this.gameState.switchSide;
    gameStates[index] = { ...gameStates[index], switchSide };
    this.sessionService.set({ gameStates });
  }

  public async forceDisconnect() {
    const result = await this.alertService.confirm(
      this.translate.instant('TABLE_FORCE_DISCONNECT_CONFIRM')
    );

    if (!result) {
      return;
    }

    this.gameService.forceDisconnect();
  }

  ngOnChanges() {
    if (!this.gameState) {
      return;
    }
    this.isSelfPlay = this.gameState.state?.gameSettings?.selfPlay === true;
    this.isReplay = !!this.gameState.replay;
    this.undoEnabled = this.gameState.undoEnabled === true;
    this.canUndo = this.gameState.canUndo === true;

    if (this.gameState.replay) {
      this.isObserver = true;
      this.isPlaying = false;
      this.isYourTurn = false;
      this.canShare = typeof this.gameState.matchId === 'number'
        || typeof this.gameState.replayId === 'number';
      return;
    }
    if (!this.clientId) {
      this.canShare = false;
      return;
    }
    const state = this.gameState.state;
    const activePlayer = state.players[state.activePlayer];

    this.isYourTurn = activePlayer
      && activePlayer.id === this.clientId
      && state.phase === GamePhase.PLAYER_TURN;

    this.isPlaying = state.players.some(p => p.id === this.clientId);
    const waitingForPlayers = state.players.length < 2;
    this.isObserver = !this.isPlaying && !waitingForPlayers;
    this.canShare = this.isPlaying && !!this.gameState.gameId && !this.gameState.deleted;
  }

}
