import type { EngagementType } from '../../../core/models/engagement-type.enum';

// What a 25-minute session of each engagement type pays, in whole hryvnias.
export type PomodoroRewardRates = Readonly<Record<EngagementType, number>>;
