import type { Goal } from '../../../core/models/goal.model';

export interface MonthGoalGroup {
  month: string;
  goals: Goal[];
}
