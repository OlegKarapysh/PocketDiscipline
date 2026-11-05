import { Service } from '@angular/core';
import { cmp } from 'dexie';
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

  /**
   * Gives detached daily-task rows, in place, the sortOrder the version 10 upgrade gives stored ones:
   * their position in primary key order. Backup restore applies it to the rows of an older backup.
   */
  orderRows(tasks: Record<string, unknown>[]): void {
    tasks.sort((a, b) => cmp(a['id'], b['id']));
    tasks.forEach((task, index) => {
      task['sortOrder'] = index;
    });
  }
}
