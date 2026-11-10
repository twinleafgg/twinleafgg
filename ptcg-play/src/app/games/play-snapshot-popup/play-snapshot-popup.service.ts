import { Injectable } from '@angular/core';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

import {
  PlaySnapshotPopupComponent,
  PlaySnapshotPopupData,
} from './play-snapshot-popup.component';

@Injectable({
  providedIn: 'root'
})
export class PlaySnapshotPopupService {

  constructor(private dialog: MatDialog) { }

  public openDialog(
    data: PlaySnapshotPopupData = {}
  ): MatDialogRef<PlaySnapshotPopupComponent, boolean | undefined> {
    return this.dialog.open(PlaySnapshotPopupComponent, {
      width: '480px',
      maxWidth: '90vw',
      data,
      autoFocus: false,
    });
  }
}
