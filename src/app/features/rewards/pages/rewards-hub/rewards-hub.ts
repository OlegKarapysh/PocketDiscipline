import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RewardStore } from '../../components/reward-store/reward-store';
import { WithdrawalLedger } from '../../components/withdrawal-ledger/withdrawal-ledger';
import { SpendingAnalytics } from '../../components/spending-analytics/spending-analytics';
import { QuickSpendDialog } from '../../components/quick-spend-dialog/quick-spend-dialog';
import type { WithdrawalRecord } from '../../../../core/models/withdrawal.model';

const SNACKBAR_DURATION_MS = 3000;

@Component({
  selector: 'app-rewards-hub',
  templateUrl: './rewards-hub.html',
  styleUrl: './rewards-hub.scss',
  imports: [
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    RewardStore,
    WithdrawalLedger,
    SpendingAnalytics,
  ],
})
export class RewardsHub {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  openQuickSpend(): void {
    const dialogRef = this.dialog.open<QuickSpendDialog, undefined, WithdrawalRecord>(
      QuickSpendDialog,
      {
        width: '400px',
      }
    );

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: WithdrawalRecord | undefined) => {
        if (result) {
          this.snackBar.open(`Quick spend "${result.title}" recorded`, 'Close', {
            duration: SNACKBAR_DURATION_MS,
          });
        }
      });
  }
}
