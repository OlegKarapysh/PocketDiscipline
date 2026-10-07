import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import {
  FALLBACK_CATEGORY_ID,
  INITIAL_REWARD_CATEGORIES,
} from '../../src/app/core/constants/initial-reward-categories.const';

// The version 9 upgrade on a real IndexedDB: the unit specs mock Dexie, so only a browser can show
// that a database left by version 8, with fractions of a hryvnia in its money, opens in whole hryvnias.

const DATABASE = 'pocket-discipline-db';
// Dexie opens IndexedDB at ten times its own version number.
const NATIVE_V8 = 80;
const NATIVE_V9 = 90;

// The stores and indexes Dexie had created by version 8: every version(N).stores() block up to 8, merged.
const V8_STORES: Record<string, { keyPath: string; indexes: string[] }> = {
  users: { keyPath: 'id', indexes: [] },
  tasks: { keyPath: 'id', indexes: ['type', 'isCompleted'] },
  goals: { keyPath: 'id', indexes: ['status', 'completedAt'] },
  dailyTasks: { keyPath: 'id', indexes: [] },
  dailyScores: { keyPath: 'date', indexes: [] },
  pomodoroSessions: { keyPath: 'id', indexes: ['startTime', 'status'] },
  dailyTaskCompletions: { keyPath: 'id', indexes: ['date', 'taskId'] },
  withdrawals: { keyPath: 'id', indexes: ['date', 'categoryId', 'timestamp', 'rewardId'] },
  rewards: { keyPath: 'id', indexes: ['categoryId', 'type', 'status', 'createdAt'] },
  rewardCategories: { keyPath: 'id', indexes: ['name', 'isProtected'] },
};

type Rows = Record<string, Record<string, unknown>[]>;

// Money as version 8 could store it: floating-point hryvnias. The balance is 100 ₴ less 99.90 ₴, as
// floating point leaves it; the reward with a text cost is a value that is not a number.
const V8_ROWS: Rows = {
  users: [{ id: 1, name: 'Current', balance: 100 - 99.9 + 1000, createdAt: 1, updatedAt: 1 }],
  goals: [
    { id: 'goal-1', title: 'Migrated goal', rewardValue: 1234.5, status: 'ACTIVE', completedAt: null, createdAt: 1 },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Migrated habit',
      type: 'HABIT',
      rewardValue: 10.4,
      isCompleted: false,
      lastCompletedAt: null,
      createdAt: 1,
    },
  ],
  dailyTasks: [
    {
      id: 'daily-1',
      title: 'Migrated daily task',
      createdAt: 1,
      difficulties: [
        { id: 'easy', name: 'Easy', baseReward: 100 },
        { id: 'odd', name: 'Odd', baseReward: 12.5 },
        { id: 'unset', name: 'Unset', baseReward: null },
      ],
      streak: 0,
      lastCompletedAt: null,
    },
  ],
  dailyTaskCompletions: [
    {
      id: 'completion-1',
      taskId: 'daily-1',
      date: '2026-01-01',
      difficultyId: 'easy',
      rewardEarned: 149.6,
      completedAt: 1,
    },
  ],
  dailyScores: [{ date: '2026-01-01', score: 10, rewardEarned: 750.2, streakAtThisDay: 6, createdAt: 1 }],
  pomodoroSessions: [
    {
      id: 'session-done',
      durationMinutes: 15,
      engagementType: 'work',
      startTime: 1,
      endTime: 2,
      status: 'completed',
      rewardEarned: 12.5,
    },
    {
      id: 'session-cancelled',
      durationMinutes: 25,
      engagementType: 'work',
      startTime: 3,
      endTime: 4,
      status: 'cancelled',
    },
  ],
  withdrawals: [
    {
      id: 'spend-1',
      amount: 99.9,
      title: 'Dinner',
      categoryId: FALLBACK_CATEGORY_ID,
      date: '2026-01-01',
      timestamp: 1,
      rewardId: null,
    },
  ],
  rewards: [
    {
      id: 'reward-1',
      title: 'Headphones',
      cost: 2500.55,
      categoryId: FALLBACK_CATEGORY_ID,
      type: 'repeatable',
      status: 'active',
      claimCount: 0,
      claimedAt: null,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'reward-text',
      title: 'Text cost',
      cost: '12.5',
      categoryId: FALLBACK_CATEGORY_ID,
      type: 'repeatable',
      status: 'archived',
      claimCount: 0,
      claimedAt: null,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  rewardCategories: INITIAL_REWARD_CATEGORIES.map((category) => ({ ...category })),
};

// Creates the version 8 database before the app has ever run. Any same-origin page that does not boot
// the app will do; the favicon is the smallest.
async function createV8Database(page: Page): Promise<void> {
  await page.goto('/favicon.ico');
  await page.evaluate(
    async ({ database, version, stores, rows }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(database, version);
        request.onupgradeneeded = () => {
          const db = request.result;
          for (const [name, { keyPath, indexes }] of Object.entries(stores)) {
            const store = db.createObjectStore(name, { keyPath });
            for (const index of indexes) store.createIndex(index, index);
            for (const row of rows[name] ?? []) store.add(row);
          }
        };
        request.onsuccess = () => {
          request.result.close();
          resolve();
        };
        request.onerror = () => {
          reject(new Error('could not create the version 8 database'));
        };
      });
    },
    { database: DATABASE, version: NATIVE_V8, stores: V8_STORES, rows: V8_ROWS },
  );
}

// Reads every store back, without asking for a version, so the app's open connection is not disturbed.
function readDatabase(page: Page): Promise<{ version: number; rows: Rows }> {
  return page.evaluate(
    async ({ database, storeNames }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(database);
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(new Error('could not open the database'));
        };
      });
      const tx = db.transaction(storeNames, 'readonly');
      const entries = await Promise.all(
        storeNames.map(
          (name) =>
            new Promise<[string, Record<string, unknown>[]]>((resolve, reject) => {
              const request = tx.objectStore(name).getAll();
              request.onsuccess = () => {
                resolve([name, request.result as Record<string, unknown>[]]);
              };
              request.onerror = () => {
                reject(new Error(`could not read ${name}`));
              };
            }),
        ),
      );
      db.close();
      return { version: db.version, rows: Object.fromEntries(entries) };
    },
    { database: DATABASE, storeNames: Object.keys(V8_STORES) },
  );
}

const balance = (page: Page) => page.locator('app-balance-widget app-amount');

test.describe('Money in whole hryvnias: the version 9 upgrade', () => {
  test.beforeEach(async ({ page }) => {
    await createV8Database(page);
    await page.goto('/dashboard');
    await expect(balance(page)).toHaveText(/^1\s000\s*₴$/);
  });

  test('should round every stored money value to whole hryvnias', async ({ page }) => {
    const { version, rows } = await readDatabase(page);

    expect(version).toBe(NATIVE_V9);
    expect(rows['users'][0]['balance']).toBe(1000);
    expect(rows['goals'][0]['rewardValue']).toBe(1235);
    expect(rows['tasks'][0]['rewardValue']).toBe(10);
    expect(rows['dailyTasks'][0]['difficulties']).toEqual([
      { id: 'easy', name: 'Easy', baseReward: 100 },
      { id: 'odd', name: 'Odd', baseReward: 13 },
      { id: 'unset', name: 'Unset', baseReward: null },
    ]);
    expect(rows['dailyTaskCompletions'][0]['rewardEarned']).toBe(150);
    expect(rows['dailyScores'][0]['rewardEarned']).toBe(750);
    const sessions = new Map(rows['pomodoroSessions'].map((session) => [session['id'], session]));
    expect(sessions.get('session-done')?.['rewardEarned']).toBe(13);
    expect(sessions.get('session-cancelled')).not.toHaveProperty('rewardEarned');
    expect(rows['withdrawals'][0]['amount']).toBe(100);
    const rewards = new Map(rows['rewards'].map((reward) => [reward['id'], reward]));
    expect(rewards.get('reward-1')?.['cost']).toBe(2501);
    expect(rewards.get('reward-text')?.['cost']).toBe('12.5');
    expect(rows['goals'][0]['title']).toBe('Migrated goal');
  });

  test('should show the rounded amounts, without decimals', async ({ page }) => {
    await page.goto('/goals');
    await expect(page.locator('app-goal-item', { hasText: 'Migrated goal' }).locator('app-amount')).toHaveText(
      /^\+1\s235\s*₴$/,
    );

    await page.goto('/tasks');
    const dailyTask = page.locator('app-daily-task-item', { hasText: 'Migrated daily task' });
    await expect(dailyTask.getByRole('button', { name: /Easy\s*\+100\s*₴/ })).toBeVisible();
    await expect(dailyTask.getByRole('button', { name: /Odd\s*\+13\s*₴/ })).toBeVisible();

    await page.goto('/rewards');
    await expect(page.locator('app-reward-card', { hasText: 'Headphones' }).locator('.cost-value')).toHaveText(
      /^2\s501\s*₴$/,
    );
    await page.getByRole('tab', { name: /History/ }).click();
    await expect(page.locator('.ledger-item', { hasText: 'Dinner' }).locator('app-amount')).toHaveText(/^-100\s*₴$/);
  });
});
