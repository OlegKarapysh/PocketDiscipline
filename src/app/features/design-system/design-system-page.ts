import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Amount } from '../../shared/components/amount/amount';
import { Badge } from '../../shared/components/badge/badge';
import { BarChart } from '../../shared/components/bar-chart/bar-chart';
import type { BarChartBar } from '../../shared/components/bar-chart/bar-chart-bar.model';
import type { BarChartLegendItem } from '../../shared/components/bar-chart/bar-chart-legend-item.model';
import type { BarChartScale } from '../../shared/components/bar-chart/bar-chart-scale.model';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PeriodFilter } from '../../shared/components/period-filter/period-filter';
import type { PeriodFilterValue } from '../../shared/components/period-filter/period-filter-value.model';
import { ProgressRing } from '../../shared/components/progress-ring/progress-ring';
import { SectionCard } from '../../shared/components/section-card/section-card';
import { SegmentedControl } from '../../shared/components/segmented-control/segmented-control';
import type { SegmentOption } from '../../shared/components/segmented-control/segment-option.model';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { StreakBadge } from '../../shared/components/streak-badge/streak-badge';
import { CelebrationService } from '../../shared/services/celebration.service';
import { ConfirmService } from '../../shared/services/confirm.service';

type Period = 'last7' | 'last14' | 'last30' | 'custom';

@Component({
  selector: 'app-design-system-page',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    Amount,
    Badge,
    BarChart,
    EmptyState,
    PageHeader,
    PeriodFilter,
    ProgressRing,
    SectionCard,
    SegmentedControl,
    StatCard,
    StreakBadge,
  ],
  templateUrl: './design-system-page.html',
  styleUrl: './design-system-page.scss',
})
export class DesignSystemPage {
  private readonly celebration = inject(CelebrationService);
  private readonly confirm = inject(ConfirmService);

  readonly period = signal<Period>('last7');
  readonly periodFilter = signal<PeriodFilterValue>({ preset: 'last7', startDate: '', endDate: '' });
  readonly periodOptions: readonly SegmentOption<Period>[] = [
    { value: 'last7', label: '7 days' },
    { value: 'last14', label: '14 days' },
    { value: 'last30', label: '30 days' },
    { value: 'custom', label: 'Custom' },
  ];

  readonly chartScale: BarChartScale = { max: 300, tickLabels: ['0', '100', '200', '300'] };
  readonly chartLegend: readonly BarChartLegendItem[] = [
    { label: 'Goals', tone: 'reward' },
    { label: 'Focus', tone: 'primary' },
  ];
  readonly chartBars: readonly BarChartBar[] = [
    {
      key: '2026-09-28',
      axisLabel: '09/28',
      ariaLabel: '2026-09-28: 250 ₴',
      segments: [
        { value: 150, tone: 'reward' },
        { value: 100, tone: 'primary' },
      ],
      tooltip: {
        title: '2026-09-28',
        rows: [
          { label: 'Total', amount: 250, emphasis: true },
          { label: 'Goals', amount: 150, swatch: 'reward' },
          { label: 'Focus', amount: 100, swatch: 'primary' },
        ],
      },
    },
    {
      key: '2026-09-29',
      axisLabel: '09/29',
      ariaLabel: '2026-09-29: 0 ₴',
      segments: [],
      tooltip: {
        title: '2026-09-29',
        rows: [{ label: 'Total', amount: 0, emphasis: true }],
        note: 'No earnings recorded',
      },
    },
    {
      key: '2026-09-30',
      axisLabel: '09/30',
      ariaLabel: '2026-09-30: 75 ₴',
      segments: [{ value: 75, tone: 'primary' }],
      tooltip: {
        title: '2026-09-30',
        rows: [
          { label: 'Pomodoros', text: '3', emphasis: true },
          { label: 'Reward', amount: 75, signedAmount: true },
        ],
      },
    },
  ];

  celebrate(): void {
    this.celebration
      .show({ title: 'Goal complete', subtitle: 'do 100 squats', amount: 1500, canUndo: true })
      .subscribe();
  }

  askDelete(): void {
    this.confirm
      .ask({
        title: 'Delete this goal?',
        message: 'Its history will be removed. This can’t be undone.',
        confirmText: 'Delete',
        isDestructive: true,
      })
      .subscribe();
  }
}
