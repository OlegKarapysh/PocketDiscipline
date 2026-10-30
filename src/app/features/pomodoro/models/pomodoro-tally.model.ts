import type { EngagementType } from '../../../core/models/engagement-type.enum';

// The figures for a set of days. One completed session is one pomodoro, whatever its duration.
export interface PomodoroTally {
  readonly pomodoros: number;
  // Every engagement type, zero included; the values add up to `pomodoros`.
  readonly byType: Readonly<Record<EngagementType, number>>;
  readonly focusMinutes: number;
  readonly rewardEarned: number;
}
