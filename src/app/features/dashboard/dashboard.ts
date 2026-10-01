import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { defer, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { BalanceWidget } from './components/balance-widget/balance-widget';
import { EarningsChart } from './components/earnings-chart/earnings-chart';
import { EarningsFilter } from './components/earnings-filter/earnings-filter';
import { EarningsStats } from './components/earnings-stats/earnings-stats';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { DashboardEarningsService } from './services/dashboard-earnings.service';
import { ClockService } from '../../core/services/clock.service';
import type { EarningsPeriodFilter } from './models/earnings-period-filter.model';
import type { MonthChangeEvent } from './models/month-change-event.model';

@Component({
  selector: 'app-dashboard',
  imports: [BalanceWidget, EarningsChart, EarningsFilter, EarningsStats, PageHeader],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly earningsService = inject(DashboardEarningsService);
  private readonly clock = inject(ClockService);

  private readonly selectedFilter = signal<EarningsPeriodFilter>({ preset: 'last7', startDate: '', endDate: '' });

  readonly currentFilter = computed<EarningsPeriodFilter>(() => {
    const filter = this.selectedFilter();
    if (filter.preset === 'custom') return filter;

    // A preset range ends today, so it moves with the calendar day.
    this.clock.today();
    return { preset: filter.preset, ...this.earningsService.getPresetDateRange(filter.preset) };
  });

  readonly selectedMonth = signal<MonthChangeEvent>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  // The current month's summary averages over the days elapsed so far, so a new day re-queries it.
  private readonly monthQuery = computed(() => ({ ...this.selectedMonth(), today: this.clock.today() }));

  readonly dailyEarnings = toSignal(
    toObservable(this.currentFilter).pipe(
      switchMap((filter) => {
        if (!filter.startDate || !filter.endDate) {
          return of([]);
        }
        return defer(() => this.earningsService.getDailyEarnings(filter.startDate, filter.endDate)).pipe(
          catchError((error) => {
            console.error('Failed to load daily earnings:', error);
            return of([]);
          }),
        );
      }),
    ),
    { initialValue: [] },
  );

  readonly monthlySummary = toSignal(
    toObservable(this.monthQuery).pipe(
      switchMap(({ year, month }) => {
        if (!year || !month) {
          return of(null);
        }
        return defer(() => this.earningsService.getMonthlyEarningsSummary(year, month)).pipe(
          catchError((error) => {
            console.error('Failed to load monthly summary:', error);
            return of(null);
          }),
        );
      }),
    ),
    { initialValue: null },
  );

  onFilterChange(filter: EarningsPeriodFilter): void {
    this.selectedFilter.set(filter);
  }

  onMonthChange(event: MonthChangeEvent): void {
    this.selectedMonth.set(event);
  }
}
