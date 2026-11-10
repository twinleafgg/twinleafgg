import { Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
  MatLegacyDialogRef as MatDialogRef,
} from '@angular/material/legacy-dialog';
import { TranslateService } from '@ngx-translate/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { finalize, switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs';

import { AlertService } from '../../shared/alert/alert.service';
import { ApiError } from '../../api/api.error';
import { FileInput } from '../../shared/file-input/file-input.model';
import { GameService } from '../../api/services/game.service';
import { SessionService } from '../../shared/session/session.service';

export interface PlaySnapshotPopupData {
  initialCode?: string;
  autoPlay?: boolean;
}

@UntilDestroy()
@Component({
  selector: 'ptcg-play-snapshot-popup',
  templateUrl: './play-snapshot-popup.component.html',
  styleUrls: ['./play-snapshot-popup.component.scss']
})
export class PlaySnapshotPopupComponent implements OnInit {

  public loading = false;
  public error: string | null = null;
  public code = '';
  public snapshotFile: FileInput | null = null;

  constructor(
    private alertService: AlertService,
    private dialogRef: MatDialogRef<PlaySnapshotPopupComponent>,
    private gameService: GameService,
    private router: Router,
    private sessionService: SessionService,
    private translate: TranslateService,
    @Inject(MAT_DIALOG_DATA) public data: PlaySnapshotPopupData
  ) {
    this.code = (data && data.initialCode) ? String(data.initialCode).toUpperCase() : '';
  }

  ngOnInit(): void {
    if (this.data && this.data.autoPlay && this.code.trim()) {
      this.playWithCode();
    }
  }

  public onCodeInput(value: string): void {
    this.code = (value || '').toUpperCase();
  }

  public onFileChange(value: FileInput): void {
    this.snapshotFile = value;
    this.error = null;
    if (value && value.files && value.files.length > 0) {
      this.playWithFile(value.files[0]);
    }
  }

  public cancel(): void {
    this.dialogRef.close();
  }

  public playWithCode(): void {
    const trimmed = this.code.trim().toUpperCase();
    if (!trimmed) {
      return;
    }
    this.play({ code: trimmed });
  }

  private playWithFile(file: File): void {
    this.loading = true;
    this.error = null;
    const reader = new FileReader();
    reader.onload = () => {
      const snapshotData = String(reader.result || '').trim();
      if (!snapshotData) {
        this.loading = false;
        this.error = this.translate.instant('REACT_SNAPSHOT_PLAY_ERROR');
        return;
      }
      this.play({ snapshotData });
    };
    reader.onerror = () => {
      this.loading = false;
      this.error = this.translate.instant('REACT_SNAPSHOT_PLAY_ERROR');
    };
    reader.readAsText(file);
  }

  private play(params: { code?: string; snapshotData?: string }): void {
    this.loading = true;
    this.error = null;
    this.gameService.playSnapshot(params).pipe(
      switchMap(res => {
        if (!res || !res.game) {
          return of(null);
        }
        return this.gameService.join(res.game.gameId).pipe(
          map(() => res.game.gameId)
        );
      }),
      finalize(() => { this.loading = false; }),
      untilDestroyed(this)
    ).subscribe({
      next: gameId => {
        if (gameId == null) {
          this.error = this.translate.instant('REACT_SNAPSHOT_PLAY_ERROR');
          return;
        }
        const session = this.sessionService.session;
        const local = (session.gameStates || []).find(g => g.gameId === gameId && g.deleted === false);
        this.dialogRef.close(true);
        if (local) {
          this.router.navigate(['/table', local.localId]);
        } else {
          this.router.navigate(['/table', gameId]);
        }
        this.alertService.toast(this.translate.instant('REACT_SELF_PLAY_SNACKBAR'));
      },
      error: (err: ApiError) => {
        this.error = (err && err.message) || this.translate.instant('REACT_SNAPSHOT_PLAY_ERROR');
      }
    });
  }
}
