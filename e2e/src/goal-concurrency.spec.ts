import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { readBalance, readStores } from './indexed-db';
import type { Row } from './indexed-db';

// Races between goal writes need real IndexedDB transactions: the unit specs mock Dexie, so only a
// browser shows whether two overlapping calls really run one after the other. The calls go straight
// to the page's GoalService, reached through Angular's dev-mode `ng` global, so both start in the
// same tick and nothing in the UI spaces them out.

interface GoalApi {
  addGoal(title: string, rewardValue: number): Promise<void>;
  updateGoal(id: string, title: string, rewardValue: number): Promise<void>;
  completeGoal(id: string): Promise<boolean>;
  undoCompleteGoal(id: string): Promise<boolean>;
}

type GoalCall = [method: keyof GoalApi, ...args: (string | number)[]];

interface Settled {
  ok: boolean;
  error?: string;
}

async function openGoalsPage(page: Page): Promise<void> {
  await page.goto('goals');
  await expect(page.getByText('do 100 squats')).toBeVisible();
}

// Starts every call in the same tick and reports how each one settled.
function runTogether(page: Page, calls: GoalCall[]): Promise<Settled[]> {
  return page.evaluate(async (goalCalls) => {
    const { ng } = window as unknown as { ng: { getComponent(element: Element): unknown } };
    const host = document.querySelector('app-goals-page');
    const service = host && (ng.getComponent(host) as { goalService?: GoalApi }).goalService;
    if (!service) throw new Error('GoalService is not reachable from app-goals-page');

    const results = await Promise.allSettled(
      goalCalls.map(([method, ...args]) => (service[method] as (...a: unknown[]) => Promise<unknown>)(...args)),
    );
    return results.map((result) =>
      result.status === 'fulfilled' ? { ok: true } : { ok: false, error: String(result.reason) },
    );
  }, calls);
}

async function storedGoals(page: Page): Promise<Row[]> {
  return (await readStores(page, ['goals']))['goals'];
}

async function storedGoal(page: Page, title: string): Promise<Row> {
  const goal = (await storedGoals(page)).find((row) => row['title'] === title);
  if (!goal) throw new Error(`no goal titled "${title}" stored`);
  return goal;
}

test.describe('Goal writes racing each other', () => {
  test.beforeEach(async ({ page }) => {
    await openGoalsPage(page);
  });

  test('should store only one of two goals created at the same time with the same title', async ({ page }) => {
    const results = await runTogether(page, [
      ['addGoal', 'Run 5 km', 300],
      ['addGoal', 'run 5 km ', 400],
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)?.error).toContain('A goal with this title already exists.');
    const runs = (await storedGoals(page)).filter((row) => String(row['title']).toLowerCase() === 'run 5 km');
    expect(runs).toHaveLength(1);
  });

  test('should let only one of two goals renamed at the same time take the same title', async ({ page }) => {
    const squats = await storedGoal(page, 'do 100 squats');
    const pushUps = await storedGoal(page, 'do 50 push-ups on fists');

    const results = await runTogether(page, [
      ['updateGoal', String(squats['id']), 'Morning workout', Number(squats['rewardValue'])],
      ['updateGoal', String(pushUps['id']), 'morning workout', Number(pushUps['rewardValue'])],
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const workouts = (await storedGoals(page)).filter(
      (row) => row['status'] === 'ACTIVE' && String(row['title']).toLowerCase() === 'morning workout',
    );
    expect(workouts).toHaveLength(1);
  });

  for (const editFirst of [true, false]) {
    test(`should credit the stored reward and undo back to the starting balance when an edit races a completion (${
      editFirst ? 'edit' : 'completion'
    } called first)`, async ({ page }) => {
      const goal = await storedGoal(page, 'do 100 squats');
      const id = String(goal['id']);
      const oldReward = Number(goal['rewardValue']);
      const newReward = oldReward + 5000;
      const startingBalance = await readBalance(page);
      const edit: GoalCall = ['updateGoal', id, 'do 200 squats', newReward];
      const complete: GoalCall = ['completeGoal', id];

      const results = await runTogether(page, editFirst ? [edit, complete] : [complete, edit]);

      expect(results.every((result) => result.ok)).toBe(true);
      const completed = (await storedGoals(page)).find((row) => row['id'] === id);
      expect(completed?.['status']).toBe('COMPLETED');
      expect([oldReward, newReward]).toContain(completed?.['rewardValue']);
      expect(await readBalance(page)).toBe(startingBalance + Number(completed?.['rewardValue']));

      expect(await runTogether(page, [['undoCompleteGoal', id]])).toEqual([{ ok: true }]);
      expect(await readBalance(page)).toBe(startingBalance);
    });
  }
});
