import { Service, inject } from '@angular/core';
import { getInitialGoals } from '../../../core/constants/initial-goals.const';
import { INITIAL_REWARD_CATEGORIES } from '../../../core/constants/initial-reward-categories.const';
import { DailyTaskOrderMigrationService } from '../../../database/daily-task-order-migration.service';
import { MoneyRoundingMigrationService } from '../../../database/money-rounding-migration.service';
import type { BackupData } from '../models/backup-data.type';
import { BackupImportError } from '../models/backup-import-error.model';

@Service()
export class BackupSchemaService {
  private readonly moneyRounding = inject(MoneyRoundingMigrationService);
  private readonly taskOrder = inject(DailyTaskOrderMigrationService);

  upgrade(source: BackupData, from: number, to: number): BackupData {
    const data = structuredClone(source);
    const transforms: Readonly<Partial<Record<number, () => void>>> = {
      1: () => {
        data['goals'] = getInitialGoals();
      },
      2: () => {
        data['dailyTasks'] = [];
      },
      3: () => {
        data['dailyScores'] = [];
      },
      4: () => {
        data['pomodoroSessions'] = [];
      },
      5: () => {
        data['dailyTaskCompletions'] = [];
      },
      6: () => undefined,
      7: () => {
        data['withdrawals'] = [];
        data['rewards'] = [];
        data['rewardCategories'] = structuredClone([...INITIAL_REWARD_CATEGORIES]);
      },
      8: () => {
        for (const [table, rows] of Object.entries(data))
          for (const row of rows) if (this.isRow(row)) this.moneyRounding.roundRow(table, row);
      },
      9: () => {
        // Source validation has already proved every daily task is a row.
        const tasks = data['dailyTasks'].filter((row) => this.isRow(row));
        this.taskOrder.orderRows(tasks);
        data['dailyTasks'] = tasks;
      },
      10: () => {
        data['pomodoroRewardRates'] = [];
      },
    };
    if (!Number.isInteger(from) || from < 1 || from > to)
      throw new BackupImportError('unsupported-version', 'This backup schema is not supported.');
    for (let schema = from; schema < to; schema++) {
      const transform = transforms[schema];
      if (!transform)
        throw new BackupImportError(
          'unsupported-version',
          'A required backup upgrade is unavailable. Update the app first.',
        );
      transform();
    }
    return data;
  }
  private isRow(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
