import { Service } from '@angular/core';
import type { Transaction } from 'dexie';

// Rows as version 8 left them, whose money may hold a fraction of a hryvnia.
type LegacyRow = Record<string, unknown>;

// The one money field of each table. dailyTasks keeps its money inside the difficulties array, so it
// is handled on its own.
const MONEY_FIELDS: Readonly<Record<string, string>> = {
  users: 'balance',
  goals: 'rewardValue',
  tasks: 'rewardValue',
  dailyTaskCompletions: 'rewardEarned',
  dailyScores: 'rewardEarned',
  pomodoroSessions: 'rewardEarned',
  withdrawals: 'amount',
  rewards: 'cost',
};

@Service()
export class MoneyRoundingMigrationService {
  /** The version 9 upgrade: rounds every stored money value to a whole number of hryvnias. */
  async migrate(tx: Transaction): Promise<void> {
    await Promise.all(
      [...Object.keys(MONEY_FIELDS), 'dailyTasks'].map((table) =>
        tx
          .table<LegacyRow>(table)
          .toCollection()
          .modify((row) => {
            this.roundRow(table, row);
          }),
      ),
    );
  }

  /**
   * Rounds the money of one version 8 row of the given table in place, exactly as the version 9
   * upgrade does, including the difficulty rewards inside a daily task. Backup restore applies it to
   * the detached rows of an older backup.
   */
  roundRow(table: string, row: LegacyRow): void {
    if (Object.hasOwn(MONEY_FIELDS, table)) {
      this.round(row, MONEY_FIELDS[table]);
    }
    const difficulties = row['difficulties'];
    if (table === 'dailyTasks' && Array.isArray(difficulties)) {
      difficulties.forEach((difficulty: unknown) => {
        if (this.isRow(difficulty)) {
          this.round(difficulty, 'baseReward');
        }
      });
    }
  }

  // Leaves anything that is not a number alone: a pomodoro session that was not completed has no reward.
  private round(row: LegacyRow, field: string): void {
    const value = row[field];
    if (typeof value === 'number') {
      // Math.round(-0.4) is -0, which would format as "-0 ₴".
      row[field] = Math.round(value) || 0;
    }
  }

  private isRow(value: unknown): value is LegacyRow {
    return typeof value === 'object' && value !== null;
  }
}
