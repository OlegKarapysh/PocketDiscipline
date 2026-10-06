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
    await Promise.all([
      ...Object.entries(MONEY_FIELDS).map(([table, field]) =>
        tx
          .table<LegacyRow>(table)
          .toCollection()
          .modify((row) => {
            this.round(row, field);
          }),
      ),
      tx
        .table<LegacyRow>('dailyTasks')
        .toCollection()
        .modify((task) => {
          const difficulties = task['difficulties'];
          if (Array.isArray(difficulties)) {
            difficulties.forEach((difficulty: unknown) => {
              if (this.isRow(difficulty)) {
                this.round(difficulty, 'baseReward');
              }
            });
          }
        }),
    ]);
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
