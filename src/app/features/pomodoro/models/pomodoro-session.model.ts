export type PomodoroSessionStatus = 'active' | 'completed' | 'cancelled';
export type EngagementType = 'work' | 'study';

export interface PomodoroSession {
  id: string; // UUID
  durationMinutes: number; // 15-120
  engagementType: EngagementType;
  startTime: number; // timestamp
  endTime?: number; // timestamp
  status: PomodoroSessionStatus;
  rewardEarned?: number;
}
