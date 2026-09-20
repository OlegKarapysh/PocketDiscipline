import { Service, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import type { Observable } from 'rxjs';
import { filter } from 'rxjs';
import { ConfirmDialog } from '../components/confirm-dialog/confirm-dialog';
import type { ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog-data.model';

const CONFIRM_DIALOG_WIDTH = '400px';

@Service()
export class ConfirmService {
  private dialog = inject(MatDialog);

  // Emits once if the user confirms, and never otherwise, so callers can pipe straight into the
  // action instead of re-testing the result.
  ask(data: ConfirmDialogData): Observable<true> {
    return this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data,
        width: CONFIRM_DIALOG_WIDTH,
      })
      .afterClosed()
      .pipe(filter((confirmed): confirmed is true => confirmed === true));
  }
}
