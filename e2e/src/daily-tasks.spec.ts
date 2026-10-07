import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';

// Edit and delete on a real IndexedDB: the unit specs mock Dexie, so only a browser can show that
// the streak, the completion history and the balance survive them.

const DATABASE = 'pocket-discipline-db';

type Row = Record<string, unknown>;

// Reads the given stores without asking for a version, so the app's open connection is not disturbed.
function readStores(page: Page, storeNames: string[]): Promise<Record<string, Row[]>> {
  return page.evaluate(
    async ({ database, names }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(database);
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(new Error('could not open the database'));
        };
      });
      const tx = db.transaction(names, 'readonly');
      const entries = await Promise.all(
        names.map(
          (name) =>
            new Promise<[string, Row[]]>((resolve, reject) => {
              const request = tx.objectStore(name).getAll();
              request.onsuccess = () => {
                resolve([name, request.result as Row[]]);
              };
              request.onerror = () => {
                reject(new Error(`could not read ${name}`));
              };
            }),
        ),
      );
      db.close();
      return Object.fromEntries(entries);
    },
    { database: DATABASE, names: storeNames },
  );
}

// Writes a row the way an older version of the app could have left it. The app must have opened its
// database already, and reads the row on its next load.
async function putRow(page: Page, store: string, row: Row): Promise<void> {
  await page.evaluate(
    async ({ database, storeName, value }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(database);
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(new Error('could not open the database'));
        };
      });
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => {
          resolve();
        };
        tx.onerror = () => {
          reject(new Error(`could not write ${storeName}`));
        };
      });
      db.close();
    },
    { database: DATABASE, storeName: store, value: row },
  );
}

const MONEY_STORES = ['users', 'dailyTasks', 'dailyTaskCompletions'];

const taskItem = (page: Page, title: string) => page.locator('app-daily-task-item', { hasText: title });
const snackBar = (page: Page, text: string) => page.locator('simple-snack-bar', { hasText: text });

async function createAndCompleteTask(page: Page, title: string): Promise<void> {
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Add daily task' }).click();
  await page.getByPlaceholder('e.g. Morning Workout').fill(title);
  await page.getByRole('button', { name: 'Save task' }).click();
  await taskItem(page, title).locator('.pd-difficulty', { hasText: 'Easy' }).click();
  await expect(taskItem(page, title).getByLabel('Completed today')).toBeVisible();
}

test.describe('Daily Tasks Flow', () => {
  test('should create a new daily task with Save Task and display it in the list', async ({ page }) => {
    await page.goto('/tasks');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tasks');
    await expect(page.locator('h2').first()).toContainText('Daily tasks');

    // Click Add Daily Task button in header
    const addBtn = page.getByRole('button', { name: /Add Daily Task/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Form should appear
    await expect(page.locator('app-daily-task-form')).toBeVisible();

    // Fill title
    const titleInput = page.getByPlaceholder('e.g. Morning Workout');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Morning Running');

    // Click Save Task
    const saveBtn = page.getByRole('button', { name: /Save task/i });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Form should close and task should be visible in the task list
    await expect(page.locator('app-daily-task-form')).not.toBeVisible();
    await expect(page.getByText('Morning Running')).toBeVisible();

    // Verify difficulties are rendered
    await expect(page.getByRole('button', { name: /Easy\s*\+100/i })).toBeVisible();
  });

  test('should edit a task and keep its streak, its history and the balance', async ({ page }) => {
    await createAndCompleteTask(page, 'Morning Running');
    const before = await readStores(page, MONEY_STORES);

    await taskItem(page, 'Morning Running').getByRole('button', { name: 'Edit daily task' }).click();
    const form = page.locator('app-daily-task-form');
    await expect(form.locator('mat-card-title')).toHaveText('Edit daily task');
    await expect(form.getByPlaceholder('e.g. Morning Workout')).toHaveValue('Morning Running');
    await expect(form.getByLabel('Reward', { exact: true }).first()).toHaveValue('100');

    await form.getByPlaceholder('e.g. Morning Workout').fill('Evening Running');
    await form.getByLabel('Reward', { exact: true }).first().fill('150');
    await form.getByRole('button', { name: 'Add difficulty' }).click();
    await form.getByRole('button', { name: 'Save task' }).click();

    await expect(form).toHaveCount(0);
    await expect(snackBar(page, 'Daily task updated')).toBeVisible();
    await expect(taskItem(page, 'Evening Running')).toBeVisible();

    const after = await readStores(page, MONEY_STORES);
    const [task] = after['dailyTasks'];
    expect(task).toEqual(
      expect.objectContaining({
        title: 'Evening Running',
        streak: 1,
        lastCompletedAt: before['dailyTasks'][0]['lastCompletedAt'],
      }),
    );
    expect(task['difficulties']).toHaveLength(4);
    expect((task['difficulties'] as Row[])[0]).toEqual(expect.objectContaining({ id: 'easy', baseReward: 150 }));
    expect(after['dailyTaskCompletions']).toEqual(before['dailyTaskCompletions']);
    expect(after['users']).toEqual(before['users']);
  });

  test('should ask before deleting a task, and keep its history and the balance', async ({ page }) => {
    await createAndCompleteTask(page, 'Morning Running');
    const before = await readStores(page, MONEY_STORES);
    const deleteButton = taskItem(page, 'Morning Running').getByRole('button', { name: 'Delete daily task' });
    const confirm = page.locator('app-confirm-dialog');

    await deleteButton.click();
    await expect(confirm).toContainText('"Morning Running"');
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toHaveCount(0);
    await expect(taskItem(page, 'Morning Running')).toBeVisible();

    await deleteButton.click();
    await confirm.getByRole('button', { name: 'Delete' }).click();

    await expect(snackBar(page, 'Daily task deleted')).toBeVisible();
    await expect(taskItem(page, 'Morning Running')).toHaveCount(0);

    const after = await readStores(page, MONEY_STORES);
    expect(after['dailyTasks']).toEqual([]);
    expect(after['dailyTaskCompletions']).toEqual(before['dailyTaskCompletions']);
    expect(after['users']).toEqual(before['users']);

    // The dashboard sums completions by date without looking the task up.
    await page.goto('/dashboard');
    await expect(page.locator('app-stat-card').first()).toBeVisible();
  });

  test('should explain why a task saved with an invalid reward cannot be completed, until it is edited', async ({
    page,
  }) => {
    await page.goto('/tasks');
    await expect(page.locator('app-daily-task-list app-empty-state')).toBeVisible();
    await putRow(page, 'dailyTasks', {
      id: 'legacy',
      title: 'Legacy task',
      createdAt: 1,
      difficulties: [{ id: 'easy', name: 'Easy', baseReward: -500 }],
      streak: 0,
      lastCompletedAt: null,
    });
    await page.reload();

    await taskItem(page, 'Legacy task').locator('.pd-difficulty').click();
    await expect(snackBar(page, 'Edit the task')).toBeVisible();
    expect((await readStores(page, ['dailyTaskCompletions']))['dailyTaskCompletions']).toEqual([]);

    await taskItem(page, 'Legacy task').getByRole('button', { name: 'Edit daily task' }).click();
    const form = page.locator('app-daily-task-form');
    await expect(form.locator('mat-error')).toHaveText('Reward must be at least 1 ₴');
    await form.getByLabel('Reward', { exact: true }).fill('50');
    await form.getByRole('button', { name: 'Save task' }).click();

    await taskItem(page, 'Legacy task').locator('.pd-difficulty').click();
    await expect(taskItem(page, 'Legacy task').getByLabel('Completed today')).toBeVisible();
  });
});
