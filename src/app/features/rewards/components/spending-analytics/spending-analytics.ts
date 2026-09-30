import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { ClockService } from '../../../../core/services/clock.service';

import { SpendingAnalyticsService } from '../../services/spending-analytics.service';
import type { AnalyticsPeriod } from '../../models/analytics-period.type';
import type { SpendingAnalyticsSummary } from '../../models/spending-analytics.model';
import { SpendingDonutChart } from '../spending-donut-chart/spending-donut-chart';
import { SpendingTrendChart } from '../spending-trend-chart/spending-trend-chart';
import { Amount } from '../../../../shared/components/amount/amount';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { SegmentedControl } from '../../../../shared/components/segmented-control/segmented-control';
import type { SegmentOption } from '../../../../shared/components/segmented-control/segment-option.model';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';

@Component({
  selector: 'app-spending-analytics',
  templateUrl: './spending-analytics.html',
  styleUrl: './spending-analytics.scss',
  imports: [Amount, EmptyState, SectionCard, SegmentedControl, StatCard, SpendingDonutChart, SpendingTrendChart],
})
export class SpendingAnalytics {
  private readonly analyticsService = inject(SpendingAnalyticsService);
  private readonly clock = inject(ClockService);

  readonly periodOptions: readonly SegmentOption<AnalyticsPeriod>[] = [
    { value: 'thisMonth', label: 'This month' },
    { value: 'last30', label: 'Last 30 days' },
    { value: 'thisYear', label: 'This year' },
    { value: 'allTime', label: 'All time' },
  ];

  readonly selectedPeriod = signal<AnalyticsPeriod>('thisMonth');

  // Every period is measured back from today, so a new day re-queries it.
  private readonly query = computed(() => ({ period: this.selectedPeriod(), today: this.clock.today() }));

  readonly analytics = toSignal(
    toObservable(this.query).pipe(switchMap(({ period }) => this.analyticsService.getAnalytics(period))),
    {
      initialValue: {
        period: 'thisMonth',
        granularity: 'daily',
        totalSpent: 0,
        withdrawalCount: 0,
        categoryBreakdown: [],
        spendingTrend: [],
      } satisfies SpendingAnalyticsSummary,
    },
  );

  readonly topCategory = computed(() => {
    const breakdown = this.analytics().categoryBreakdown;
    return breakdown.length > 0 ? breakdown[0] : null;
  });

  readonly topCategoryShare = computed(() => {
    const top = this.topCategory();
    return top ? `${top.percentage}% of spending` : undefined;
  });

  readonly averagePerWithdrawal = computed(() => {
    const data = this.analytics();
    if (data.withdrawalCount === 0) return 0;
    return Math.round(data.totalSpent / data.withdrawalCount);
  });

  readonly trendSubtitle = computed(() =>
    this.analytics().granularity === 'daily' ? 'Daily spending' : 'Monthly spending',
  );
}
