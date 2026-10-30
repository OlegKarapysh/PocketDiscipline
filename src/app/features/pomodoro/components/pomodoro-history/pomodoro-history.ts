import { Component, input, output } from '@angular/core';
import { PeriodFilter } from '../../../../shared/components/period-filter/period-filter';
import type { PeriodFilterValue } from '../../../../shared/components/period-filter/period-filter-value.model';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import type { PomodoroPeriodSummary } from '../../models/pomodoro-period-summary.model';
import { PomodoroHistoryChart } from '../pomodoro-history-chart/pomodoro-history-chart';
import { PomodoroStats } from '../pomodoro-stats/pomodoro-stats';

@Component({
  selector: 'app-pomodoro-history',
  imports: [PeriodFilter, SectionCard, PomodoroHistoryChart, PomodoroStats],
  templateUrl: './pomodoro-history.html',
  styleUrl: './pomodoro-history.scss',
})
export class PomodoroHistory {
  readonly summary = input.required<PomodoroPeriodSummary>();
  readonly filter = input.required<PeriodFilterValue>();
  readonly filterChange = output<PeriodFilterValue>();
}
