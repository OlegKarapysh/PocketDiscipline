import type { DailyTaskDifficulty } from '../../../core/models/daily-task-difficulty.model';

export interface DifficultyReward {
  difficulty: DailyTaskDifficulty;
  // Streak bonus included.
  reward: number;
}
