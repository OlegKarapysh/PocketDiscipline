import type { DailyTaskDifficulty } from '../../../core/models/daily-task-difficulty.model';

export interface DifficultyReward {
  difficulty: DailyTaskDifficulty;
  // Streak bonus included. Null when the stored reward is not valid, so completing pays nothing.
  reward: number | null;
}
