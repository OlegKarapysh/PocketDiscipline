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
const titles = (page: Page) => page.locator('app-daily-task-item .title');

// Opens a closed task to show its difficulties and its Edit button.
async function openTask(page: Page, title: string): Promise<void> {
  const summary = taskItem(page, title).locator('button.summary');
  await summary.click();
  await expect(summary).toHaveAttribute('aria-expanded', 'true');
}

async function createTask(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: 'Add daily task' }).click();
  await page.getByPlaceholder('e.g. Morning Workout').fill(title);
  await page.getByRole('button', { name: 'Save task' }).click();
  await expect(taskItem(page, title)).toBeVisible();
}

// Leaves the task in the opened "Done today" group.
async function createAndCompleteTask(page: Page, title: string): Promise<void> {
  await page.goto('tasks');
  await createTask(page, title);
  await openTask(page, title);
  await taskItem(page, title).locator('.pd-difficulty', { hasText: 'Easy' }).click();
  await expect(snackBar(page, `${title} done`)).toBeVisible();
  await page.getByRole('button', { name: /Done today/ }).click();
  await expect(taskItem(page, title).getByLabel('Completed today')).toBeVisible();
}

async function openEdit(page: Page, title: string): Promise<void> {
  await openTask(page, title);
  await taskItem(page, title).getByRole('button', { name: 'Edit daily task' }).click();
  await expect(page.locator('app-daily-task-form')).toBeVisible();
}

test.describe('Daily Tasks Flow', () => {
  test('should create a new daily task with Save Task and display it in the list', async ({ page }) => {
    await page.goto('tasks');

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

    // The difficulties show once the task is opened
    await expect(page.getByRole('button', { name: /Easy\s*\+100/i })).toHaveCount(0);
    await openTask(page, 'Morning Running');
    await expect(page.getByRole('button', { name: /Easy\s*\+100/i })).toBeVisible();
  });

  test('should edit a task and keep its streak, its history and the balance', async ({ page }) => {
    await createAndCompleteTask(page, 'Morning Running');
    const before = await readStores(page, MONEY_STORES);

    await openEdit(page, 'Morning Running');
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
    const form = page.locator('app-daily-task-form');
    const deleteButton = form.getByRole('button', { name: 'Delete task' });
    const confirm = page.locator('app-confirm-dialog');

    // Delete is offered only once the task is being edited.
    await openTask(page, 'Morning Running');
    await expect(page.getByRole('button', { name: /Delete/ })).toHaveCount(0);
    await taskItem(page, 'Morning Running').getByRole('button', { name: 'Edit daily task' }).click();

    await deleteButton.click();
    await expect(confirm).toContainText('"Morning Running"');
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toHaveCount(0);
    await expect(form).toBeVisible();

    await deleteButton.click();
    await confirm.getByRole('button', { name: 'Delete' }).click();

    await expect(snackBar(page, 'Daily task deleted')).toBeVisible();
    await expect(form).toHaveCount(0);
    await expect(taskItem(page, 'Morning Running')).toHaveCount(0);

    const after = await readStores(page, MONEY_STORES);
    expect(after['dailyTasks']).toEqual([]);
    expect(after['dailyTaskCompletions']).toEqual(before['dailyTaskCompletions']);
    expect(after['users']).toEqual(before['users']);

    // The dashboard sums completions by date without looking the task up.
    await page.goto('dashboard');
    await expect(page.locator('app-stat-card').first()).toBeVisible();
  });

  test('should explain why a task saved with an invalid reward cannot be completed, until it is edited', async ({
    page,
  }) => {
    await page.goto('tasks');
    await expect(page.locator('app-daily-task-list app-empty-state')).toBeVisible();
    await putRow(page, 'dailyTasks', {
      id: 'legacy',
      title: 'Legacy task',
      createdAt: 1,
      sortOrder: 0,
      difficulties: [{ id: 'easy', name: 'Easy', baseReward: -500 }],
      streak: 0,
      lastCompletedAt: null,
    });
    await page.reload();

    // Completing pays nothing, so no price is shown for it.
    await expect(taskItem(page, 'Legacy task').locator('.reward')).toHaveCount(0);
    await openTask(page, 'Legacy task');
    await expect(taskItem(page, 'Legacy task').locator('.pd-difficulty')).toHaveText(/^\s*Easy\s*--\s*₴\s*$/);
    await taskItem(page, 'Legacy task').locator('.pd-difficulty').click();
    await expect(snackBar(page, 'Edit the task')).toBeVisible();
    expect((await readStores(page, ['dailyTaskCompletions']))['dailyTaskCompletions']).toEqual([]);

    await taskItem(page, 'Legacy task').getByRole('button', { name: 'Edit daily task' }).click();
    const form = page.locator('app-daily-task-form');
    await expect(form.locator('mat-error')).toHaveText('Reward must be at least 1 ₴');
    await form.getByLabel('Reward', { exact: true }).fill('50');
    await form.getByRole('button', { name: 'Save task' }).click();

    await taskItem(page, 'Legacy task').locator('.pd-difficulty').click();
    await expect(snackBar(page, 'Legacy task done · +50 ₴')).toBeVisible();
  });

  test('should move a task done today into its own group, and count it', async ({ page }) => {
    await page.goto('tasks');
    await createTask(page, 'Run');
    await createTask(page, 'Read');
    await expect(page.locator('.progress')).toHaveText('0 of 2 done today');

    await openTask(page, 'Run');
    await taskItem(page, 'Run').locator('.pd-difficulty', { hasText: 'Medium' }).click();

    await expect(snackBar(page, 'Run done · +200 ₴')).toBeVisible();
    await expect(page.locator('.progress')).toHaveText('1 of 2 done today');
    await expect(titles(page)).toHaveText(['Read']);

    const doneToggle = page.getByRole('button', { name: 'Done today (1)' });
    await doneToggle.click();
    await expect(doneToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(taskItem(page, 'Run').getByLabel('Completed today')).toBeVisible();
    await expect(taskItem(page, 'Run').locator('app-amount')).toHaveText(/^\+200\s*₴$/);
  });

  test('should show the rewards with the streak bonus, and pay what it shows', { tag: '@smoke' }, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-29T12:00:00'));
    await page.goto('tasks');
    await expect(page.locator('app-daily-task-list app-empty-state')).toBeVisible();
    await putRow(page, 'dailyTasks', {
      id: 'streaky',
      title: 'Cold water',
      createdAt: 1,
      sortOrder: 0,
      difficulties: [
        { id: 'easy', name: 'Easy', baseReward: 100 },
        { id: 'hard', name: 'Hard', baseReward: 300 },
      ],
      streak: 5,
      lastCompletedAt: new Date('2026-10-28T12:00:00').getTime(),
    });
    await page.reload();

    // Today makes a 6-day streak, which pays 50% on top.
    const item = taskItem(page, 'Cold water');
    await expect(item.locator('.reward app-amount')).toHaveText([/^\+150\s*₴$/, /^450\s*₴$/]);
    await openTask(page, 'Cold water');
    await expect(item.locator('.pd-difficulty')).toHaveText([/Easy\s*\+150\s*₴/, /Hard\s*\+450\s*₴/]);

    await item.locator('.pd-difficulty', { hasText: 'Easy' }).click();

    await expect(snackBar(page, 'Cold water done · +150 ₴')).toBeVisible();
    const after = await readStores(page, MONEY_STORES);
    expect(after['dailyTaskCompletions']).toEqual([expect.objectContaining({ taskId: 'streaky', rewardEarned: 150 })]);
    expect(after['dailyTasks']).toEqual([expect.objectContaining({ id: 'streaky', streak: 6 })]);
  });

  test('should open one task at a time', async ({ page }) => {
    await page.goto('tasks');
    await createTask(page, 'Run');
    await createTask(page, 'Read');

    await openTask(page, 'Run');
    await openTask(page, 'Read');

    await expect(taskItem(page, 'Run').locator('button.summary')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.pd-difficulty')).toHaveCount(3);
  });

  test('should keep the order the user gives the tasks, after a reload', async ({ page }) => {
    await page.goto('tasks');
    for (const title of ['Run', 'Read', 'Swim']) await createTask(page, title);
    await expect(titles(page)).toHaveText(['Run', 'Read', 'Swim']);

    await page.getByRole('button', { name: 'Reorder' }).click();
    const order = page.locator('app-daily-task-reorder-list .title');
    await page.getByRole('button', { name: 'Move down: Run' }).click();
    await expect(order).toHaveText(['Read', 'Run', 'Swim']);

    // Drags Swim by its handle to the top.
    const handle = page.locator('app-daily-task-reorder-list .row', { hasText: 'Swim' }).locator('.handle');
    const target = page.locator('app-daily-task-reorder-list .row', { hasText: 'Read' });
    const from = await handle.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error('the rows are not on screen');
    const x = from.x + from.width / 2;
    await page.mouse.move(x, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, from.y + from.height / 2 - 10, { steps: 5 });
    await page.mouse.move(x, to.y + 4, { steps: 20 });
    await page.mouse.up();
    await expect(order).toHaveText(['Swim', 'Read', 'Run']);

    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(titles(page)).toHaveText(['Swim', 'Read', 'Run']);

    await page.reload();
    await expect(titles(page)).toHaveText(['Swim', 'Read', 'Run']);
    const { dailyTasks } = await readStores(page, ['dailyTasks']);
    expect(Object.fromEntries(dailyTasks.map((task) => [task['title'], task['sortOrder']]))).toEqual({
      Swim: 0,
      Read: 1,
      Run: 2,
    });
  });

  test('should keep the one-off tasks on a tab of their own', async ({ page }) => {
    await page.goto('tasks');
    await expect(page.locator('app-task-list')).toHaveCount(0);

    await page.getByRole('tab', { name: /One-off/ }).click();

    await expect(page.locator('app-task-list')).toBeVisible();
    await expect(page.locator('app-daily-task-list')).toHaveCount(0);
  });
});
