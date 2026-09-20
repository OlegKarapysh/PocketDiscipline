import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, from, switchMap, tap } from 'rxjs';

import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WithdrawalService } from '../../services/withdrawal.service';
import { CategoryService } from '../../services/category.service';
import type { WithdrawalRecord } from '../../../../core/models/withdrawal.model';
import type { RewardCategory } from '../../../../core/models/reward-category.model';
import type { WithdrawalFilter } from '../../models/withdrawal-filter.model';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';

const NO_FILTERS: WithdrawalFilter = {
  categoryId: undefined,
  startDate: undefined,
  endDate: undefined,
  searchQuery: undefined,
};

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
export class WithdrawalLedger {
  private readonly withdrawalService = inject(WithdrawalService);
  private readonly categoryService = inject(CategoryService);
  private readonly confirmService = inject(ConfirmService);
  private readonly snackBar = inject(SnackBarService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchQuery = signal('');
  readonly selectedCategoryId = signal('');
  readonly startDate = signal('');
  readonly endDate = signal('');

  // The committed filter, which is what actually drives the query. It is set from the four inputs
  // only once the range validates, so an invalid range leaves the current results in place.
  private readonly filters = signal<WithdrawalFilter>(NO_FILTERS);

  readonly withdrawals = toSignal(
    toObservable(this.filters).pipe(
      switchMap((filter) =>
        this.withdrawalService.getWithdrawals(filter).pipe(
          catchError((err: unknown) => {
            this.snackBar.error(err, 'Failed to load withdrawals');
            return EMPTY;
          })
        )
      )
    ),
    { initialValue: [] as WithdrawalRecord[] }
  );

  readonly categories = toSignal(
    this.categoryService.getCategories().pipe(
      catchError((err: unknown) => {
        this.snackBar.error(err, 'Failed to load categories');
        return EMPTY;
      })
    ),
    { initialValue: [] as RewardCategory[] }
  );

  readonly categoryMap = computed(
    () => new Map<string, RewardCategory>(this.categories().map((c) => [c.id, c]))
  );

  readonly hasActiveFilters = computed(
    () => !!(this.searchQuery() || this.selectedCategoryId() || this.startDate() || this.endDate())
  );

  onFilterChange(): void {
    if (this.startDate() && this.endDate() && this.startDate() > this.endDate()) {
      this.snackBar.show('Start date cannot be after end date');
      return;
    }

    this.filters.set({
      categoryId: this.selectedCategoryId() || undefined,
      startDate: this.startDate() || undefined,
      endDate: this.endDate() || undefined,
      searchQuery: this.searchQuery() || undefined,
    });
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategoryId.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.onFilterChange();
  }

  confirmRevert(withdrawal: WithdrawalRecord): void {
    this.confirmService
      .ask({
        title: 'Revert Withdrawal',
        message: `Are you sure you want to revert "${withdrawal.title}" (${withdrawal.amount} ₴)? The amount will be refunded to your balance.`,
        confirmText: 'Revert & Refund',
        cancelText: 'Cancel',
        isDestructive: true,
      })
      .pipe(
        switchMap(() =>
          from(this.withdrawalService.revertWithdrawal(withdrawal.id)).pipe(
            tap(() => { this.snackBar.show('Withdrawal reverted and balance refunded'); }),
            catchError(() => {
              this.snackBar.show('Failed to revert withdrawal');
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
