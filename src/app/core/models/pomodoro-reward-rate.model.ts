import type { EngagementType } from './engagement-type.enum';

export interface PomodoroRewardRate {
  engagementType: EngagementType;
  baseReward: number;
}
