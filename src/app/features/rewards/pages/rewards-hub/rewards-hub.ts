import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RewardStoreComponent } from '../../components/reward-store/reward-store';
import { WithdrawalLedgerComponent } from '../../components/withdrawal-ledger/withdrawal-ledger';
import { SpendingAnalyticsComponent } from '../../components/spending-analytics/spending-analytics';
import { QuickSpendDialogComponent } from '../../components/quick-spend-dialog/quick-spend-dialog';
import { WithdrawalRecord } from '../../models/withdrawal.model';

const SNACKBAR_DURATION_MS = 3000;

@Component({
  selector: 'app-rewards-hub',
  templateUrl: './rewards-hub.html',
  styleUrl: './rewards-hub.scss',
  imports: [
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    RewardStoreComponent,
    WithdrawalLedgerComponent,
    SpendingAnalyticsComponent,
  ],
})
export class RewardsHubComponent {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  openQuickSpend(): void {
    const dialogRef = this.dialog.open<QuickSpendDialogComponent, undefined, WithdrawalRecord>(
      QuickSpendDialogComponent,
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
