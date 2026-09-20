export interface DailyTaskCompletion {
  id: string;
  taskId: string;
  date: string;
  difficultyId: string;
  rewardEarned: number;
  completedAt: number;
}
