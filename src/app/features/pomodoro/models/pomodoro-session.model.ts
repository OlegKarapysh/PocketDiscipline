import { EngagementType } from './engagement-type.enum';
import { PomodoroSessionStatus } from './pomodoro-session-status.enum';

export interface PomodoroSession {
  id: string;
  durationMinutes: number;
  engagementType: EngagementType;
  startTime: number;
  endTime?: number;
  status: PomodoroSessionStatus;
  rewardEarned?: number;
}
