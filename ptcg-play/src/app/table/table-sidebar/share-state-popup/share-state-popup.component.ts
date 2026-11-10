import { Component, Inject, OnInit } from '@angular/core';
import {
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
  MatLegacyDialogRef as MatDialogRef,
} from '@angular/material/legacy-dialog';
import { TranslateService } from '@ngx-translate/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { finalize } from 'rxjs/operators';

import { AlertService } from '../../../shared/alert/alert.service';
import { ApiError } from '../../../api/api.error';
import { GameService } from '../../../api/services/game.service';

export interface ShareStatePopupData {
  gameId?: number;
  matchId?: number;
  replayId?: number;
  position?: number;
}

@UntilDestroy()
@Component({
  selector: 'ptcg-share-state-popup',
  templateUrl: './share-state-popup.component.html',
  styleUrls: ['./share-state-popup.component.scss']
})
export class ShareStatePopupComponent implements OnInit {

  public loading = false;
  public error: string | null = null;
  public code: string | null = null;
  public snapshotData: string | null = null;
  public copied = false;

  constructor(
    private alertService: AlertService,
    private dialogRef: MatDialogRef<ShareStatePopupComponent>,
    private gameService: GameService,
    private translate: TranslateService,
    @Inject(MAT_DIALOG_DATA) public data: ShareStatePopupData
  ) { }

  ngOnInit(): void {
    this.createShare();
  }

  public createShare(): void {
    this.loading = true;
    this.error = null;
    this.copied = false;

    let request$;
    if (typeof this.data.gameId === 'number' && this.data.gameId > 0) {
      request$ = this.gameService.createSnapshot(this.data.gameId);
    } else if (typeof this.data.matchId === 'number') {
      request$ = this.gameService.createSnapshotFromMatch(this.data.matchId, this.data.position || 0);
    } else if (typeof this.data.replayId === 'number') {
      request$ = this.gameService.createSnapshotFromReplay(this.data.replayId, this.data.position || 0);
    } else {
      this.loading = false;
      this.error = this.translate.instant('REACT_SHARE_STATE_ERROR');
      return;
    }

    request$.pipe(
      finalize(() => { this.loading = false; }),
      untilDestroyed(this)
    ).subscribe({
      next: res => {
        this.code = res.code;
        this.snapshotData = res.snapshotData;
      },
      error: (err: ApiError) => {
        this.error = (err && err.message) || this.translate.instant('REACT_SHARE_STATE_ERROR');
      }
    });
  }

  public async copyLink(): Promise<void> {
    if (!this.code) {
      return;
    }
    const link = `${window.location.origin}/snapshot/${this.code}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      try {
        await navigator.clipboard.writeText(this.code);
      } catch {
        this.alertService.toast(this.translate.instant('REACT_SHARE_STATE_ERROR'));
        return;
      }
    }
    this.copied = true;
  }

  public downloadFile(): void {
    if (!this.code || !this.snapshotData) {
      return;
    }
    const blob = new Blob([this.snapshotData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-${this.code}.ptcgsnap`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public close(): void {
    this.dialogRef.close();
  }
}
