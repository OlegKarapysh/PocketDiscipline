import { DailyTaskDifficulty } from './daily-task-difficulty.model';

export interface DailyTask {
  id: string;
  title: string;
  createdAt: number;
  
  difficulties: DailyTaskDifficulty[];
  
  streak: number;
  lastCompletedAt: number | null;
}

