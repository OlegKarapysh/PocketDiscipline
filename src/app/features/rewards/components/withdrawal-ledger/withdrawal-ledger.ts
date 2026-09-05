import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { WithdrawalService } from '../../services/withdrawal.service';
import { CategoryService } from '../../services/category.service';
import { WithdrawalRecord } from '../../models/withdrawal.model';
import { RewardCategory } from '../../models/reward-category.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog-data.model';

const SNACKBAR_DURATION_MS = 3000;

@Component({
  selector: 'app-withdrawal-ledger',
  templateUrl: './withdrawal-ledger.html',
  styleUrl: './withdrawal-ledger.scss',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
})
export class WithdrawalLedgerComponent implements OnInit, OnDestroy {
  private readonly withdrawalService = inject(WithdrawalService);
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly withdrawals = signal<WithdrawalRecord[]>([]);
  readonly categories = signal<RewardCategory[]>([]);
  readonly categoryMap = signal<Map<string, RewardCategory>>(new Map());

  searchQuery = '';
  selectedCategoryId = '';
  startDate = '';
  endDate = '';

  private withdrawalsSub?: Subscription;

  ngOnInit(): void {
    this.categoryService.getCategories().subscribe((cats) => {
      this.categories.set(cats);
      const map = new Map<string, RewardCategory>();
      cats.forEach((c) => map.set(c.id, c));
      this.categoryMap.set(map);
    });

    this.loadWithdrawals();
  }

  loadWithdrawals(): void {
    if (this.startDate && this.endDate && this.startDate > this.endDate) {
      this.snackBar.open('Start date cannot be after end date', 'Close', { duration: 3000 });
      return;
    }

    const filter = {
      categoryId: this.selectedCategoryId || undefined,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined,
      searchQuery: this.searchQuery || undefined,
    };

    if (this.withdrawalsSub) {
      this.withdrawalsSub.unsubscribe();
    }

    this.withdrawalsSub = this.withdrawalService.getWithdrawals(filter).subscribe((records) => {
      this.withdrawals.set(records);
    });
  }

  ngOnDestroy(): void {
    if (this.withdrawalsSub) {
      this.withdrawalsSub.unsubscribe();
    }
  }

  onFilterChange(): void {
    this.loadWithdrawals();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategoryId = '';
    this.startDate = '';
    this.endDate = '';
    this.loadWithdrawals();
  }

  confirmRevert(withdrawal: WithdrawalRecord): void {
    const dialogData: ConfirmDialogData = {
      title: 'Revert Withdrawal',
      message: `Are you sure you want to revert "${withdrawal.title}" (${withdrawal.amount} ₴)? The amount will be refunded to your balance.`,
      confirmText: 'Revert & Refund',
      cancelText: 'Cancel',
      isDestructive: true,
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData,
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.executeRevert(withdrawal.id);
      }
    });
  }

  private async executeRevert(id: string): Promise<void> {
    try {
      await this.withdrawalService.revertWithdrawal(id);
      this.snackBar.open('Withdrawal reverted and balance refunded', 'Close', {
        duration: SNACKBAR_DURATION_MS,
      });
      this.loadWithdrawals();
    } catch {
      this.snackBar.open('Failed to revert withdrawal', 'Close', {
        duration: SNACKBAR_DURATION_MS,
      });
    }
  }

  getCategory(categoryId: string): RewardCategory | undefined {
    return this.categoryMap().get(categoryId);
  }
}
