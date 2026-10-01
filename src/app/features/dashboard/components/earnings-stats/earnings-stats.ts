import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ClockService } from '../../../../core/services/clock.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Amount } from '../../../../shared/components/amount/amount';
import { Badge } from '../../../../shared/components/badge/badge';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import type { MonthlyEarningsSummary } from '../../models/monthly-earnings-summary.model';
import type { MonthChangeEvent } from '../../models/month-change-event.model';

@Component({
  selector: 'app-earnings-stats',
  imports: [MatButtonModule, MatIconModule, Amount, Badge, StatCard],
  templateUrl: './earnings-stats.html',
  styleUrl: './earnings-stats.scss',
})
export class EarningsStats {
  private readonly clock = inject(ClockService);

  readonly summary = input<MonthlyEarningsSummary | null>(null);

  readonly monthChange = output<MonthChangeEvent>();

  readonly currentYear = signal<number>(new Date().getFullYear());
  readonly currentMonth = signal<number>(new Date().getMonth() + 1);

  readonly isNextDisabled = computed(() => {
    const [actualYear, actualMonth] = this.clock.today().split('-').map(Number);

    if (this.currentYear() > actualYear) {
      return true;
    }
    if (this.currentYear() === actualYear && this.currentMonth() >= actualMonth) {
      return true;
    }
    return false;
  });

  readonly hasNoEarnings = computed(() => {
    const currentSummary = this.summary();
    return currentSummary !== null && currentSummary.totalEarned === 0;
  });

  readonly averageHint = computed(() => {
    const currentSummary = this.summary();
    if (!currentSummary) {
      return '';
    }
    const kind = currentSummary.isCurrentMonth ? 'elapsed' : 'calendar';
    return `Based on ${currentSummary.daysCount} ${kind} days`;
  });

  goToPreviousMonth(): void {
    let year = this.currentYear();
    let month = this.currentMonth() - 1;

    if (month < 1) {
      month = 12;
      year -= 1;
    }

    this.currentYear.set(year);
    this.currentMonth.set(month);
    this.monthChange.emit({ year, month });
  }

  goToNextMonth(): void {
    if (this.isNextDisabled()) {
      return;
    }

    let year = this.currentYear();
    let month = this.currentMonth() + 1;

    if (month > 12) {
      month = 1;
      year += 1;
    }

    this.currentYear.set(year);
    this.currentMonth.set(month);
    this.monthChange.emit({ year, month });
  }
}
