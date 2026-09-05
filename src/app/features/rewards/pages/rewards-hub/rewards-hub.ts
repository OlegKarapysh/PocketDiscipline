import { Component, inject } from '@angular/core';

import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RewardStoreComponent } from '../../components/reward-store/reward-store';
import { WithdrawalLedgerComponent } from '../../components/withdrawal-ledger/withdrawal-ledger';
import { SpendingAnalyticsComponent } from '../../components/spending-analytics/spending-analytics';
import { QuickSpendDialogComponent } from '../../components/quick-spend-dialog/quick-spend-dialog';

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

  openQuickSpend(): void {
    const dialogRef = this.dialog.open(QuickSpendDialogComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open(`Quick spend "${result.title}" recorded`, 'Close', {
          duration: SNACKBAR_DURATION_MS,
        });
      }
    });
  }
}
