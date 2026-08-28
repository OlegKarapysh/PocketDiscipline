export type PomodoroSessionStatus = 'active' | 'completed' | 'cancelled';

export const POMODORO_SESSION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type EngagementType = 'work' | 'study';

export const ENGAGEMENT_TYPE = {
  WORK: 'work',
  STUDY: 'study',
} as const;

export interface PomodoroSession {
  id: string;
  durationMinutes: number;
  engagementType: EngagementType;
  startTime: number;
  endTime?: number;
  status: PomodoroSessionStatus;
  rewardEarned?: number;
}
