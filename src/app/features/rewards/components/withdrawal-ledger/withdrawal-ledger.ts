import type { OnInit, OnDestroy} from '@angular/core';
import { Component, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription} from 'rxjs';
import { catchError, EMPTY, filter, from, switchMap, tap } from 'rxjs';

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
import type { WithdrawalRecord } from '../../../../core/models/withdrawal.model';
import type { RewardCategory } from '../../../../core/models/reward-category.model';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import type { ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog-data.model';

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
export class WithdrawalLedger implements OnInit, OnDestroy {
  private readonly withdrawalService = inject(WithdrawalService);
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly withdrawals = signal<WithdrawalRecord[]>([]);
  readonly categories = signal<RewardCategory[]>([]);
  readonly categoryMap = signal<Map<string, RewardCategory>>(new Map());

  searchQuery = '';
  selectedCategoryId = '';
  startDate = '';
  endDate = '';

  private withdrawalsSub?: Subscription;

  ngOnInit(): void {
    this.categoryService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cats) => {
          this.categories.set(cats);
          const map = new Map<string, RewardCategory>();
          cats.forEach((c) => map.set(c.id, c));
          this.categoryMap.set(map);
        },
        error: (err) => {
          const message = err instanceof Error ? err.message : 'Failed to load categories';
          this.snackBar.open(message, 'Close', { duration: SNACKBAR_DURATION_MS });
        },
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

    this.withdrawalsSub = this.withdrawalService
      .getWithdrawals(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (records) => {
          this.withdrawals.set(records);
        },
        error: (err) => {
          const message = err instanceof Error ? err.message : 'Failed to load withdrawals';
          this.snackBar.open(message, 'Close', { duration: SNACKBAR_DURATION_MS });
        },
      });
  }

  ngOnDestroy(): void {
    if (this.withdrawalsSub) {
      this.withdrawalsSub.unsubscribe();
      this.withdrawalsSub = undefined;
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

    const dialogRef = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(
      ConfirmDialog,
      {
        data: dialogData,
        width: '400px',
      }
    );

    dialogRef
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() =>
          from(this.withdrawalService.revertWithdrawal(withdrawal.id)).pipe(
            tap(() => {
              this.snackBar.open('Withdrawal reverted and balance refunded', 'Close', {
                duration: SNACKBAR_DURATION_MS,
              });
              this.loadWithdrawals();
            }),
            catchError(() => {
              this.snackBar.open('Failed to revert withdrawal', 'Close', {
                duration: SNACKBAR_DURATION_MS,
              });
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  getCategory(categoryId: string): RewardCategory | undefined {
    return this.categoryMap().get(categoryId);
  }
}
