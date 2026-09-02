import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { BalanceWidgetComponent } from './components/balance-widget/balance-widget';
import { EarningsChartComponent } from './components/earnings-chart/earnings-chart.component';
import { EarningsFilterComponent } from './components/earnings-filter/earnings-filter.component';
import { EarningsStatsComponent } from './components/earnings-stats/earnings-stats.component';
import { DashboardEarningsService } from './services/dashboard-earnings.service';
import { EarningsPeriodFilter } from './models/earnings-period-filter.model';
import { MonthChangeEvent } from './models/month-change-event.model';

const DEFAULT_PRESET = 'last7';
const MONTH_STEP = 1;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    BalanceWidgetComponent,
    EarningsChartComponent,
    EarningsFilterComponent,
    EarningsStatsComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly earningsService = inject(DashboardEarningsService);

  private readonly initialRange = this.earningsService.getPresetDateRange(DEFAULT_PRESET);

  readonly currentFilter = signal<EarningsPeriodFilter>({
    preset: DEFAULT_PRESET,
    startDate: this.initialRange.startDate,
    endDate: this.initialRange.endDate,
  });

  readonly selectedMonth = signal<MonthChangeEvent>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + MONTH_STEP,
  });

  readonly dailyEarnings = toSignal(
    toObservable(this.currentFilter).pipe(
      switchMap(filter => this.earningsService.getDailyEarnings(filter.startDate, filter.endDate))
    ),
    { initialValue: [] }
  );

  readonly monthlySummary = toSignal(
    toObservable(this.selectedMonth).pipe(
      switchMap(({ year, month }) => this.earningsService.getMonthlyEarningsSummary(year, month))
    ),
    { initialValue: null }
  );

  onFilterChange(filter: EarningsPeriodFilter): void {
    this.currentFilter.set(filter);
  }

  onMonthChange(event: MonthChangeEvent): void {
    this.selectedMonth.set(event);
  }
}
