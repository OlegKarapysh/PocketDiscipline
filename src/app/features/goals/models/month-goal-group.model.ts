import { Goal } from './goal.model';

export interface MonthGoalGroup {
  month: string;
  goals: Goal[];
}
