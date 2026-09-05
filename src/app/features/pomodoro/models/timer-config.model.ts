import { EngagementType } from './engagement-type.enum';

export interface TimerConfig {
  durationMinutes: number;
  engagementType: EngagementType;
}
