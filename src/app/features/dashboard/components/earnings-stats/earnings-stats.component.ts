import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MonthlyEarningsSummary } from '../../models/monthly-earnings-summary.model';
import { MonthChangeEvent } from '../../models/month-change-event.model';

const MONTH_JANUARY = 1;
const MONTH_DECEMBER = 12;
const MONTH_STEP = 1;
const YEAR_STEP = 1;
const ZERO_EARNINGS = 0;

@Component({
  selector: 'app-earnings-stats',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './earnings-stats.component.html',
  styleUrl: './earnings-stats.component.scss'
})
export class EarningsStatsComponent {
  readonly summary = input<MonthlyEarningsSummary | null>(null);

  readonly monthChange = output<MonthChangeEvent>();

  readonly currentYear = signal<number>(new Date().getFullYear());
  readonly currentMonth = signal<number>(new Date().getMonth() + MONTH_STEP);

  readonly isNextDisabled = computed(() => {
    const now = new Date();
    const actualYear = now.getFullYear();
    const actualMonth = now.getMonth() + MONTH_STEP;

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
    return !currentSummary || currentSummary.totalEarned === ZERO_EARNINGS;
  });

  goToPreviousMonth(): void {
    let year = this.currentYear();
    let month = this.currentMonth() - MONTH_STEP;

    if (month < MONTH_JANUARY) {
      month = MONTH_DECEMBER;
      year -= YEAR_STEP;
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
    let month = this.currentMonth() + MONTH_STEP;

    if (month > MONTH_DECEMBER) {
      month = MONTH_JANUARY;
      year += YEAR_STEP;
    }

    this.currentYear.set(year);
    this.currentMonth.set(month);
    this.monthChange.emit({ year, month });
  }
}

