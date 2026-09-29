import { Component, DestroyRef, computed, inject, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormField, form, validate } from '@angular/forms/signals';
import { EMPTY, catchError, from, switchMap, tap } from 'rxjs';

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
import { Amount } from '../../../../shared/components/amount/amount';
import { Badge } from '../../../../shared/components/badge/badge';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { MONEY_FORMAT } from '../../../../shared/constants/money-format.const';

const EMPTY_FILTER_FORM = { searchQuery: '', categoryId: '', startDate: '', endDate: '' };

@Component({
  selector: 'app-withdrawal-ledger',
  templateUrl: './withdrawal-ledger.html',
  styleUrl: './withdrawal-ledger.scss',
  imports: [
    FormField,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    Amount,
    Badge,
    EmptyState,
  ],
})
export class WithdrawalLedger {
  private readonly withdrawalService = inject(WithdrawalService);
  private readonly categoryService = inject(CategoryService);
  private readonly confirmService = inject(ConfirmService);
  private readonly snackBar = inject(SnackBarService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly filterModel = signal(EMPTY_FILTER_FORM);

  readonly filterForm = form(this.filterModel, (path) => {
    validate(path.endDate, (ctx) => {
      const start = ctx.valueOf(path.startDate);
      const end = ctx.value();
      return start && end && start > end ? { kind: 'dateRange', message: 'Start date cannot be after end date' } : null;
    });
  });

  // The committed filter, which is what actually drives the query. It follows the form only while
  // the form is valid, so an inverted date range leaves the current results in place.
  private readonly filters = linkedSignal<typeof EMPTY_FILTER_FORM | null, WithdrawalFilter>({
    source: () => (this.filterForm().valid() ? this.filterModel() : null),
    computation: (value, previous) =>
      value
        ? {
            categoryId: value.categoryId || undefined,
            startDate: value.startDate || undefined,
            endDate: value.endDate || undefined,
            searchQuery: value.searchQuery || undefined,
          }
        : (previous?.value ?? {}),
  });

  readonly withdrawals = toSignal(
    toObservable(this.filters).pipe(
      switchMap((filter) =>
        this.withdrawalService.getWithdrawals(filter).pipe(
          catchError((err: unknown) => {
            this.snackBar.error(err, 'Failed to load withdrawals');
            return EMPTY;
          }),
        ),
      ),
    ),
    { initialValue: [] as WithdrawalRecord[] },
  );

  readonly categories = toSignal(
    this.categoryService.getCategories().pipe(
      catchError((err: unknown) => {
        this.snackBar.error(err, 'Failed to load categories');
        return EMPTY;
      }),
    ),
    { initialValue: [] as RewardCategory[] },
  );

  private readonly categoryMap = computed(
    () => new Map<string, RewardCategory>(this.categories().map((c) => [c.id, c])),
  );

  readonly rows = computed(() => {
    const categories = this.categoryMap();
    return this.withdrawals().map((withdrawal) => {
      const category = categories.get(withdrawal.categoryId);
      return {
        withdrawal,
        color: category?.color,
        icon: category?.icon ?? 'category',
        categoryName: category?.name ?? 'Uncategorized',
      };
    });
  });

  readonly dateRangeError = computed(() => this.filterForm.endDate().errors()[0]?.message);

  readonly hasActiveFilters = computed(() => Object.values(this.filterModel()).some(Boolean));

  clearFilters(): void {
    this.filterModel.set(EMPTY_FILTER_FORM);
  }

  confirmRevert(withdrawal: WithdrawalRecord): void {
    this.confirmService
      .ask({
        title: 'Revert withdrawal',
        message: `Are you sure you want to revert "${withdrawal.title}" (${MONEY_FORMAT.format(withdrawal.amount)} ₴)? The amount will be refunded to your balance.`,
        confirmText: 'Revert & refund',
        cancelText: 'Cancel',
        isDestructive: true,
      })
      .pipe(
        switchMap(() =>
          from(this.withdrawalService.revertWithdrawal(withdrawal.id)).pipe(
            tap(() => {
              this.snackBar.show('Withdrawal reverted and balance refunded');
            }),
            catchError(() => {
              this.snackBar.show('Failed to revert withdrawal');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
