import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const DATABASE = 'pocket-discipline-db';

type Row = Record<string, unknown>;

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

const taskItem = (page: Page, title: string) => page.locator('app-task-item', { hasText: title });
const snackBar = (page: Page, text: string) => page.locator('simple-snack-bar', { hasText: text });

async function openOneOffTab(page: Page): Promise<void> {
  await page.goto('tasks');
  await page.getByRole('tab', { name: /One-off/ }).click();
  await expect(page.locator('app-task-list')).toBeVisible();
}

async function createOneOffTask(page: Page, title: string, reward: string): Promise<void> {
  await page.getByRole('button', { name: 'Add one-off task' }).click();
  const form = page.locator('app-task-form');
  await expect(form).toBeVisible();
  await form.getByPlaceholder('e.g. Pay internet bill').fill(title);
  await form.getByLabel('Reward').fill(reward);
  await form.getByRole('button', { name: 'Save task' }).click();
  await expect(taskItem(page, title)).toBeVisible();
}

test.describe('One-Off Tasks Flow', () => {
  test('should show an empty state without "Add initial tasks" when no one-off tasks exist', async ({ page }) => {
    await openOneOffTab(page);

    const emptyState = page.locator('app-task-list app-empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No one-off tasks yet');
    await expect(page.getByRole('button', { name: /Add initial tasks/i })).toHaveCount(0);
  });

  test('should validate title and whole-hryvnia reward, then create a one-off task without type badges', async ({
    page,
  }) => {
    await openOneOffTab(page);

    await page.getByRole('button', { name: 'Add one-off task' }).click();
    const form = page.locator('app-task-form');
    const saveBtn = form.getByRole('button', { name: 'Save task' });

    // Empty title keeps Save task disabled
    await expect(saveBtn).toBeDisabled();

    // Whitespace-only title is invalid
    const titleInput = form.getByPlaceholder('e.g. Pay internet bill');
    await titleInput.fill('   ');
    await expect(saveBtn).toBeDisabled();

    // Fractional or zero reward is invalid
    await titleInput.fill('Pay internet bill');
    const rewardInput = form.getByLabel('Reward');
    await rewardInput.fill('0');
    await expect(saveBtn).toBeDisabled();
    await rewardInput.fill('12.5');
    await expect(saveBtn).toBeDisabled();

    // Valid title and whole-hryvnia reward
    await rewardInput.fill('150');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    await expect(form).toHaveCount(0);
    await expect(snackBar(page, 'One-off task added')).toBeVisible();

    const item = taskItem(page, 'Pay internet bill');
    await expect(item).toBeVisible();
    await expect(item.locator('app-amount')).toHaveText(/^\+150\s*₴$/);
    await expect(item.locator('app-badge')).toHaveCount(0);
  });

  test('should edit a pending one-off task in place and support cancelling an edit', async ({ page }) => {
    await openOneOffTab(page);
    await createOneOffTask(page, 'Pay internet bill', '150');

    // Open edit and cancel
    await taskItem(page, 'Pay internet bill').getByRole('button', { name: 'Edit one-off task' }).click();
    const form = page.locator('app-task-form');
    await expect(form.locator('mat-card-title')).toHaveText('Edit one-off task');
    await form.getByPlaceholder('e.g. Pay internet bill').fill('Discarded change');
    await form.getByRole('button', { name: 'Cancel' }).click();
    await expect(form).toHaveCount(0);
    await expect(taskItem(page, 'Pay internet bill')).toBeVisible();

    // Open edit and save
    await taskItem(page, 'Pay internet bill').getByRole('button', { name: 'Edit one-off task' }).click();
    await form.getByPlaceholder('e.g. Pay internet bill').fill('File quarterly taxes');
    await form.getByLabel('Reward').fill('200');
    await form.getByRole('button', { name: 'Save task' }).click();

    await expect(form).toHaveCount(0);
    await expect(snackBar(page, 'One-off task updated')).toBeVisible();
    const updatedItem = taskItem(page, 'File quarterly taxes');
    await expect(updatedItem).toBeVisible();
    await expect(updatedItem.locator('app-amount')).toHaveText(/^\+200\s*₴$/);
  });

  test(
    'should complete a one-off task to credit balance and move to Completed, then undo to revert and debit balance',
    { tag: '@smoke' },
    async ({ page }) => {
      await openOneOffTab(page);
      await createOneOffTask(page, 'Pay internet bill', '150');

      const beforeStores = await readStores(page, ['users']);
      const initialBalance = Number(beforeStores['users'][0]?.['balance'] ?? 0);

      // Complete task
      await taskItem(page, 'Pay internet bill').getByRole('button', { name: 'Complete' }).click();
      await expect(snackBar(page, 'Pay internet bill done · +150 ₴')).toBeVisible();
      await expect(page.locator('app-task-list .all-done')).toContainText('Everything is done.');

      const afterCompleteStores = await readStores(page, ['users']);
      expect(afterCompleteStores['users'][0]?.['balance']).toBe(initialBalance + 150);

      // Expand Completed section and verify no Edit/Delete actions on completed task
      const completedToggle = page.getByRole('button', { name: 'Completed (1)' });
      await completedToggle.click();
      await expect(completedToggle).toHaveAttribute('aria-expanded', 'true');

      const completedItem = page
        .locator('#oneoff-tasks-done')
        .locator('app-task-item', { hasText: 'Pay internet bill' });
      await expect(completedItem).toBeVisible();
      await expect(completedItem.getByRole('button', { name: 'Edit one-off task' })).toHaveCount(0);
      await expect(completedItem.getByRole('button', { name: 'Delete one-off task' })).toHaveCount(0);

      // Undo completion
      await completedItem.getByRole('button', { name: 'Undo' }).click();
      await expect(snackBar(page, 'Completion undone')).toBeVisible();
      await expect(taskItem(page, 'Pay internet bill').getByRole('button', { name: 'Complete' })).toBeVisible();

      const afterUndoStores = await readStores(page, ['users']);
      expect(afterUndoStores['users'][0]?.['balance']).toBe(initialBalance);
    },
  );

  test('should ask before deleting a pending one-off task and keep the user balance unchanged', async ({ page }) => {
    await openOneOffTab(page);
    await createOneOffTask(page, 'Pay internet bill', '150');

    const beforeStores = await readStores(page, ['users']);
    const confirm = page.locator('app-confirm-dialog');

    // Cancel deletion
    await taskItem(page, 'Pay internet bill').getByRole('button', { name: 'Delete one-off task' }).click();
    await expect(confirm).toContainText('"Pay internet bill"');
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toHaveCount(0);
    await expect(taskItem(page, 'Pay internet bill')).toBeVisible();

    // Confirm deletion
    await taskItem(page, 'Pay internet bill').getByRole('button', { name: 'Delete one-off task' }).click();
    await confirm.getByRole('button', { name: 'Delete' }).click();

    await expect(snackBar(page, 'One-off task deleted')).toBeVisible();
    await expect(taskItem(page, 'Pay internet bill')).toHaveCount(0);
    await expect(page.locator('app-task-list app-empty-state')).toBeVisible();

    const afterStores = await readStores(page, ['users', 'tasks']);
    expect(afterStores['tasks']).toEqual([]);
    expect(afterStores['users']).toEqual(beforeStores['users']);
  });
});
