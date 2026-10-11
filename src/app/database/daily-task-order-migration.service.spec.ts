import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Transaction } from 'dexie';
import { DailyTaskOrderMigrationService } from './daily-task-order-migration.service';

type Row = Record<string, unknown>;

// Stands in for the Dexie upgrade transaction: modify() runs its callback on every row in key order.
const fakeTransaction = (rows: Row[]) =>
  ({
    table: () => ({
      toCollection: () => ({
        modify: (change: (row: Row) => void) => {
          rows.forEach(change);
          return Promise.resolve(rows.length);
        },
      }),
    }),
  }) as unknown as Transaction;

describe('DailyTaskOrderMigrationService', () => {
  let service: DailyTaskOrderMigrationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DailyTaskOrderMigrationService);
  });

  it('should number the tasks in the order they were listed in', async () => {
    const rows: Row[] = [
      { id: 'a', title: 'Read', createdAt: 3 },
      { id: 'b', title: 'Run', createdAt: 1 },
      { id: 'c', title: 'Stretch', createdAt: 2 },
    ];

    await service.migrate(fakeTransaction(rows));

    expect(rows.map((row) => row['sortOrder'])).toEqual([0, 1, 2]);
  });

  it('should leave the rest of each task as it was', async () => {
    const rows: Row[] = [{ id: 'a', title: 'Read', createdAt: 3, streak: 4, lastCompletedAt: 5, difficulties: [] }];

    await service.migrate(fakeTransaction(rows));

    expect(rows[0]).toEqual({
      id: 'a',
      title: 'Read',
      createdAt: 3,
      streak: 4,
      lastCompletedAt: 5,
      difficulties: [],
      sortOrder: 0,
    });
  });
});
