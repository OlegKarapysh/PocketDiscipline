import type { JarReward } from './jar-reward.model';
import type { JarRowCategory } from './jar-row-category.type';

export interface JarStatementRow {
  // jar-<YYYYMMDDHHmm>-<closing balance in kopiykas>: unique per row, and the same in every export.
  id: string;
  line: number;
  category: JarRowCategory;
  // The bank time, or 23:59 of the day before for a row marked as yesterday's.
  completedAt: number;
  // YYYY-MM-DD of completedAt.
  date: string;
  // As written; a withdrawal can have kopiykas.
  amount: number;
  // Null for a withdrawal.
  reward: JarReward | null;
}
