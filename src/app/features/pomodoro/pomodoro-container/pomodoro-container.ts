import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { EngagementType } from '../../../core/models/engagement-type.enum';
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
import type { PomodoroPeriodSummary } from '../models/pomodoro-period-summary.model';
import { PomodoroStatsService } from '../services/pomodoro-stats.service';

// Shown until the first read of the sessions arrives.
const NO_POMODOROS: PomodoroPeriodSummary = {
  startDate: '',
  endDate: '',
  days: [],
  total: {
    pomodoros: 0,
    byType: { [EngagementType.WORK]: 0, [EngagementType.STUDY]: 0 },
    focusMinutes: 0,
    rewardEarned: 0,
  },
};

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
    { initialValue: NO_POMODOROS },
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
    { initialValue: NO_POMODOROS },
  );

  onFilterChange(filter: PeriodFilterValue): void {
    this.selectedFilter.set(filter);
  }
}
