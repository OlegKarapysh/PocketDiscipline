import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { SpendingAnalyticsService } from '../../services/spending-analytics.service';
import type { AnalyticsPeriod } from '../../models/analytics-period.type';
import type { SpendingAnalyticsSummary } from '../../models/spending-analytics.model';
import { SpendingDonutChart } from '../spending-donut-chart/spending-donut-chart';
import { SpendingTrendChart } from '../spending-trend-chart/spending-trend-chart';

const EMPTY_ANALYTICS: SpendingAnalyticsSummary = {
  period: 'thisMonth',
  granularity: 'daily',
  totalSpent: 0,
  withdrawalCount: 0,
  categoryBreakdown: [],
  spendingTrend: [],
};

@Component({
  selector: 'app-spending-analytics',
  templateUrl: './spending-analytics.html',
  styleUrl: './spending-analytics.scss',
  imports: [MatButtonToggleModule, MatIconModule, SpendingDonutChart, SpendingTrendChart],
})
export class SpendingAnalytics {
  private readonly analyticsService = inject(SpendingAnalyticsService);

  readonly selectedPeriod = signal<AnalyticsPeriod>('thisMonth');

  readonly analytics = toSignal(
    toObservable(this.selectedPeriod).pipe(
      switchMap((period) => this.analyticsService.getAnalytics(period))
    ),
    { initialValue: EMPTY_ANALYTICS }
  );

  readonly topCategory = computed(() => {
    const breakdown = this.analytics().categoryBreakdown;
    return breakdown.length > 0 ? breakdown[0] : null;
  });

  readonly averagePerWithdrawal = computed(() => {
    const data = this.analytics();
    if (data.withdrawalCount === 0) return 0;
    return Math.round(data.totalSpent / data.withdrawalCount);
  });

  onPeriodChange(period: AnalyticsPeriod): void {
    this.selectedPeriod.set(period);
  }
}
