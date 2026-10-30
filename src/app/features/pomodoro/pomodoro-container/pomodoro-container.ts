import { Component, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import { ClockService } from '../../../core/services/clock.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SectionCard } from '../../../shared/components/section-card/section-card';
import { TimerDisplay } from '../components/timer-display/timer-display';
import { TimerControls } from '../components/timer-controls/timer-controls';
import { SessionConfig } from '../components/session-config/session-config';
import { PomodoroToday } from '../components/pomodoro-today/pomodoro-today';
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
  imports: [PageHeader, SectionCard, TimerDisplay, TimerControls, SessionConfig, PomodoroToday],
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
}
