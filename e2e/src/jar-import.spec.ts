import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { JAR_STATEMENT_FIXTURE } from '../../src/app/features/jar-import/testing/jar-statement.fixture';
import { putRows, readBalance, readStores, userRow } from './indexed-db';

// The import end to end on a real IndexedDB: the synthetic statement runs 1–9 September 2026, so on
// the 9th the habits that ran every day to the 8th still have their streaks.
const NOW = new Date('2026-09-09T12:00:00');

async function pickStatement(page: Page, text: string, name = 'Jar_statement.csv'): Promise<void> {
  await page.locator('app-jar-import-page input[type="file"]').setInputFiles({
    name,
    mimeType: 'text/csv',
    buffer: Buffer.from(text, 'utf8'),
  });
}

const taskCard = (page: Page, title: string) =>
  page.locator('app-daily-task-item').filter({ has: page.locator('.title', { hasText: new RegExp(`^${title}$`) }) });

test.describe('Jar import', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW);
    await page.goto('/dashboard');
    await expect(page.locator('app-balance-widget')).toBeVisible();
    await putRows(page, { users: [userRow(7_000)] });
    await page.goto('/settings');
    await page.getByRole('link', { name: 'Import jar statement' }).click();
    await expect(page).toHaveURL(/\/settings\/jar-import$/);
  });

  test('should reject a file that is not a jar statement and write nothing', async ({ page }) => {
    await pickStatement(page, 'Date,Amount\n01.09.2026,100\n', 'other.csv');

    await expect(page.getByRole('alert')).toHaveText(/This is not a monobank jar statement\./);
    await expect(page.locator('app-jar-review-list')).toHaveCount(0);
  });

  test('should import the history, keep the balance and carry the streaks on', async ({ page }) => {
    await pickStatement(page, JAR_STATEMENT_FIXTURE);
    await expect(page.locator('app-jar-statement-summary')).toContainText('56 rows');
    await expect(page.locator('.review-row')).toHaveCount(15);

    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(page.locator('simple-snack-bar')).toContainText(
      'Imported 41 completions into 6 tasks · 4 scores · 7 focus sessions · 3 goals · 2 withdrawals · 2 skipped',
    );
    await expect(page).toHaveURL(/\/tasks$/);
    for (const title of ['Тренировка', 'Холодный душ', 'Подтягивания', 'Sally up']) {
      await expect(taskCard(page, title).locator('app-streak-badge')).toHaveText(/8-day streak/);
    }
    // Ревью дня stopped on the 3rd, so its streak is over by the 9th.
    await expect(taskCard(page, 'Ревью дня').locator('app-streak-badge')).toHaveCount(0);
    await expect(taskCard(page, 'Подтягивания').locator('.pd-difficulty')).toHaveText([
      /^\s*12–19 /,
      /^\s*20–29 /,
      /^\s*30\+ /,
    ]);

    expect(await readBalance(page)).toBe(7_000);
    await page.goto('/dashboard');
    await expect(page.locator('app-stat-card', { hasText: 'Total earned' }).locator('app-amount')).toHaveText(
      /^11\s493\s*₴$/,
    );
  });

  test('should add nothing when the same statement is imported again', async ({ page }) => {
    await pickStatement(page, JAR_STATEMENT_FIXTURE);
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(page).toHaveURL(/\/tasks$/);
    const before = await readStores(page, ['dailyTasks', 'dailyTaskCompletions', 'goals', 'withdrawals']);

    await page.goto('/settings/jar-import');
    await pickStatement(page, JAR_STATEMENT_FIXTURE);
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(page.locator('simple-snack-bar')).toContainText(
      'Nothing new to import · 54 already imported · 2 skipped',
    );
    expect(await readStores(page, ['dailyTasks', 'dailyTaskCompletions', 'goals', 'withdrawals'])).toEqual(before);
    expect(await readBalance(page)).toBe(7_000);
  });
});
