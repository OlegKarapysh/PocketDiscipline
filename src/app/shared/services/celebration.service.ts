import { Service, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import { CelebrationDialog } from '../components/celebration-dialog/celebration-dialog';
import type { CelebrationDialogData } from '../components/celebration-dialog/celebration-dialog-data.model';
import type { CelebrationResult } from '../components/celebration-dialog/celebration-result.type';

@Service()
export class CelebrationService {
  private readonly dialog = inject(MatDialog);

  show(data: CelebrationDialogData): Observable<CelebrationResult> {
    return this.dialog
      .open<CelebrationDialog, CelebrationDialogData, CelebrationResult>(CelebrationDialog, {
        data,
        width: '340px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .pipe(map((result) => result ?? 'dismissed'));
  }
}
