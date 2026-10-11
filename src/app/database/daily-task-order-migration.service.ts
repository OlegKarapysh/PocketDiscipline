import { Service } from '@angular/core';
import type { Transaction } from 'dexie';

@Service()
export class DailyTaskOrderMigrationService {
  /**
   * The version 10 upgrade: gives every daily task a sortOrder. The list used to show the tasks in
   * primary key order, which is the order modify() visits them in, so the list looks the same after.
   */
  async migrate(tx: Transaction): Promise<void> {
    let sortOrder = 0;
    await tx
      .table<Record<string, unknown>>('dailyTasks')
      .toCollection()
      .modify((task) => {
        task['sortOrder'] = sortOrder++;
      });
  }
}
