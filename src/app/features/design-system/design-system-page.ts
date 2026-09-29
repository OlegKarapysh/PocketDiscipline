import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Amount } from '../../shared/components/amount/amount';
import { Badge } from '../../shared/components/badge/badge';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';
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
    EmptyState,
    PageHeader,
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
  readonly periodOptions: readonly SegmentOption<Period>[] = [
    { value: 'last7', label: '7 days' },
    { value: 'last14', label: '14 days' },
    { value: 'last30', label: '30 days' },
    { value: 'custom', label: 'Custom' },
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
