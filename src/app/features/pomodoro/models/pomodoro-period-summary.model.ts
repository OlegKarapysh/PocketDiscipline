import type { DailyPomodoroTally } from './daily-pomodoro-tally.model';
import type { PomodoroTally } from './pomodoro-tally.model';

export interface PomodoroPeriodSummary {
  readonly startDate: string;
  readonly endDate: string;
  // One per date of the range, oldest first, zero-filled. Empty for an invalid range.
  readonly days: readonly DailyPomodoroTally[];
  // The sum of `days`.
  readonly total: PomodoroTally;
}
