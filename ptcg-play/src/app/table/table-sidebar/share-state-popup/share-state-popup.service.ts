import { Injectable } from '@angular/core';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

import {
  ShareStatePopupComponent,
  ShareStatePopupData,
} from './share-state-popup.component';

@Injectable({
  providedIn: 'root'
})
export class ShareStatePopupService {

  constructor(private dialog: MatDialog) { }

  public openDialog(data: ShareStatePopupData): MatDialogRef<ShareStatePopupComponent, void> {
    return this.dialog.open(ShareStatePopupComponent, {
      width: '440px',
      maxWidth: '90vw',
      data,
      autoFocus: false,
    });
  }
}
