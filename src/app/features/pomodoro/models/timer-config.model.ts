import type { EngagementType } from '../../../core/models/engagement-type.enum';

export interface TimerConfig {
  durationMinutes: number;
  engagementType: EngagementType;
}
