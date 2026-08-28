export type GoalStatus = 'ACTIVE' | 'COMPLETED';

export const GOAL_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
} as const;

export interface Goal {
  id: string;
  title: string;
  rewardValue: number;
  status: GoalStatus;
  completedAt: number | null;
  createdAt: number;
}
