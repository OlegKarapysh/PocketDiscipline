export interface DailyTaskDifficulty {
  id: string;
  name: string;
  baseReward: number;
}

export interface DailyTask {
  id: string;
  title: string;
  createdAt: number;
  
  difficulties: DailyTaskDifficulty[];
  
  streak: number;
  lastCompletedAt: number | null;
}

