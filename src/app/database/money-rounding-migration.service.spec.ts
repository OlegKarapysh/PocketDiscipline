import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Transaction } from 'dexie';
import { MoneyRoundingMigrationService } from './money-rounding-migration.service';

type Rows = Record<string, Record<string, unknown>[]>;

// Stands in for the Dexie upgrade transaction: modify() runs its callback on every row in place.
const fakeTransaction = (rows: Rows) =>
  ({
    table: (name: string) => ({
      toCollection: () => ({
        modify: (change: (row: Record<string, unknown>) => void) => {
          (rows[name] ?? []).forEach(change);
          return Promise.resolve((rows[name] ?? []).length);
        },
      }),
    }),
  }) as unknown as Transaction;

describe('MoneyRoundingMigrationService', () => {
  let service: MoneyRoundingMigrationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoneyRoundingMigrationService);
  });

  it('should round the money field of every table to whole hryvnias', async () => {
    const rows: Rows = {
      users: [{ id: 1, name: 'Current', balance: 1234.5 }],
      goals: [{ id: 'g', title: 'Run', rewardValue: 2000 }],
      tasks: [{ id: 't', title: 'Read', rewardValue: 20.4 }],
      dailyTaskCompletions: [{ id: 'c', rewardEarned: 149.6 }],
      dailyScores: [{ date: '2026-09-01', rewardEarned: 750 }],
      pomodoroSessions: [{ id: 'p', rewardEarned: 12.5 }],
      withdrawals: [{ id: 'w', amount: 99.9 }],
      rewards: [{ id: 'r', cost: 2500.55 }],
    };

    await service.migrate(fakeTransaction(rows));

    expect(rows['users'][0]['balance']).toBe(1235);
    expect(rows['goals'][0]['rewardValue']).toBe(2000);
    expect(rows['tasks'][0]['rewardValue']).toBe(20);
    expect(rows['dailyTaskCompletions'][0]['rewardEarned']).toBe(150);
    expect(rows['dailyScores'][0]['rewardEarned']).toBe(750);
    expect(rows['pomodoroSessions'][0]['rewardEarned']).toBe(13);
    expect(rows['withdrawals'][0]['amount']).toBe(100);
    expect(rows['rewards'][0]['cost']).toBe(2501);
  });

  it('should round the reward of every difficulty inside a daily task', async () => {
    const rows: Rows = {
      dailyTasks: [
        {
          id: 'd',
          title: 'Workout',
          streak: 3,
          difficulties: [
            { id: 'easy', name: 'Easy', baseReward: 100 },
            { id: 'hard', name: 'Hard', baseReward: 312.5 },
          ],
        },
      ],
    };

    await service.migrate(fakeTransaction(rows));

    expect(rows['dailyTasks'][0]['difficulties']).toEqual([
      { id: 'easy', name: 'Easy', baseReward: 100 },
      { id: 'hard', name: 'Hard', baseReward: 313 },
    ]);
    expect(rows['dailyTasks'][0]['streak']).toBe(3);
  });

  it('should round a balance that drifted to the nearest hryvnia, never to minus zero', async () => {
    // 100 ₴ less 99 ₴ less 1 ₴ as floating-point arithmetic can leave it, a drift just below zero.
    const rows: Rows = {
      users: [
        { id: 1, balance: 0.9999999999999432 },
        { id: 2, balance: 0.3 - 0.1 - 0.2 },
      ],
    };

    await service.migrate(fakeTransaction(rows));

    expect(rows['users'][0]['balance']).toBe(1);
    expect(Object.is(rows['users'][1]['balance'], 0)).toBe(true);
  });

  it('should leave a value that is not a number untouched', async () => {
    const rows: Rows = {
      pomodoroSessions: [{ id: 'p', status: 'cancelled' }],
      rewards: [{ id: 'r', cost: '12.5' }],
      dailyTasks: [{ id: 'd', difficulties: [{ id: 'easy', baseReward: null }] }],
    };

    await service.migrate(fakeTransaction(rows));

    expect(rows['pomodoroSessions'][0]).toEqual({ id: 'p', status: 'cancelled' });
    expect(rows['rewards'][0]['cost']).toBe('12.5');
    expect(rows['dailyTasks'][0]['difficulties']).toEqual([{ id: 'easy', baseReward: null }]);
  });

  it('should leave the other fields alone', async () => {
    const rows: Rows = { withdrawals: [{ id: 'w', amount: 5.2, title: 'Coffee', timestamp: 1_700_000_000_000 }] };

    await service.migrate(fakeTransaction(rows));

    expect(rows['withdrawals'][0]).toEqual({ id: 'w', amount: 5, title: 'Coffee', timestamp: 1_700_000_000_000 });
  });
});
