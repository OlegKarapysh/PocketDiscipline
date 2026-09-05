import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { SpendingAnalyticsService } from '../../services/spending-analytics.service';
import { AnalyticsPeriod } from '../../models/analytics-period.type';
import { SpendingAnalyticsSummary } from '../../models/spending-analytics.model';
import { SpendingDonutChartComponent } from '../spending-donut-chart/spending-donut-chart';
import { SpendingTrendChartComponent } from '../spending-trend-chart/spending-trend-chart';

@Component({
  selector: 'app-spending-analytics',
  templateUrl: './spending-analytics.html',
  styleUrl: './spending-analytics.scss',
  imports: [MatButtonToggleModule, MatIconModule, SpendingDonutChartComponent, SpendingTrendChartComponent],
})
export class SpendingAnalyticsComponent implements OnInit {
  private readonly analyticsService = inject(SpendingAnalyticsService);

  readonly selectedPeriod = signal<AnalyticsPeriod>('thisMonth');
  readonly analytics = signal<SpendingAnalyticsSummary>({
    period: 'thisMonth',
    granularity: 'daily',
    totalSpent: 0,
    withdrawalCount: 0,
    categoryBreakdown: [],
    spendingTrend: [],
  });

  readonly topCategory = computed(() => {
    const breakdown = this.analytics().categoryBreakdown;
    return breakdown.length > 0 ? breakdown[0] : null;
  });

  readonly averagePerWithdrawal = computed(() => {
    const data = this.analytics();
    if (data.withdrawalCount === 0) return 0;
    return Math.round(data.totalSpent / data.withdrawalCount);
  });

  ngOnInit(): void {
    this.loadAnalytics();
  }

  onPeriodChange(period: AnalyticsPeriod): void {
    this.selectedPeriod.set(period);
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.analyticsService.getAnalytics(this.selectedPeriod()).subscribe((summary) => {
      this.analytics.set(summary);
    });
  }
}
