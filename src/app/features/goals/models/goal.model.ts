import { GoalStatus, GOAL_STATUS } from './goal-status.type';

export { GOAL_STATUS };
export type { GoalStatus };

export interface Goal {
  id: string;
  title: string;
  rewardValue: number;
  status: GoalStatus;
  completedAt: number | null;
  createdAt: number;
}
