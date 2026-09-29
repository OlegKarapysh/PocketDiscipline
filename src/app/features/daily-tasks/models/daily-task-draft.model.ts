import type { DailyTaskDifficulty } from '../../../core/models/daily-task-difficulty.model';

export interface DailyTaskDraft {
  title: string;
  difficulties: DailyTaskDifficulty[];
}
