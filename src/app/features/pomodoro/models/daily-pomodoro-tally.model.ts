import type { PomodoroTally } from './pomodoro-tally.model';

export interface DailyPomodoroTally extends PomodoroTally {
  // Local calendar date, YYYY-MM-DD.
  readonly date: string;
}
