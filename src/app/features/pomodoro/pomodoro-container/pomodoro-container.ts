import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ClockService } from '../../../core/services/clock.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import type { PeriodFilterValue } from '../../../shared/components/period-filter/period-filter-value.model';
import { getPresetDateRange } from '../../../shared/components/period-filter/preset-date-range';
import { SectionCard } from '../../../shared/components/section-card/section-card';
import { TimerDisplay } from '../components/timer-display/timer-display';
import { TimerControls } from '../components/timer-controls/timer-controls';
import { SessionConfig } from '../components/session-config/session-config';
import { PomodoroToday } from '../components/pomodoro-today/pomodoro-today';
import { PomodoroHistory } from '../components/pomodoro-history/pomodoro-history';
import { PomodoroStatsService } from '../services/pomodoro-stats.service';

@Component({
  selector: 'app-pomodoro-container',
  imports: [PageHeader, SectionCard, TimerDisplay, TimerControls, SessionConfig, PomodoroToday, PomodoroHistory],
  templateUrl: './pomodoro-container.html',
  styleUrl: './pomodoro-container.scss',
})
export class PomodoroContainer {
  private readonly clock = inject(ClockService);
  private readonly stats = inject(PomodoroStatsService);

  readonly todaySummary = toSignal(
    toObservable(this.clock.today).pipe(switchMap((today) => this.stats.getPeriodSummary(today, today))),
  );

  private readonly selectedFilter = signal<PeriodFilterValue>({ preset: 'last7', startDate: '', endDate: '' });

  // A preset range ends today, so it moves with the calendar day; a custom range stays as chosen.
  readonly currentFilter = computed<PeriodFilterValue>(() => {
    const filter = this.selectedFilter();
    if (filter.preset === 'custom') {
      return filter;
    }
    return { preset: filter.preset, ...getPresetDateRange(filter.preset, this.clock.today()) };
  });

  readonly historySummary = toSignal(
    toObservable(this.currentFilter).pipe(
      switchMap((filter) => this.stats.getPeriodSummary(filter.startDate, filter.endDate)),
    ),
  );

  onFilterChange(filter: PeriodFilterValue): void {
    this.selectedFilter.set(filter);
  }
}
