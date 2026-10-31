import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { putRows, readBalance, userRow } from './indexed-db';

const NOW = new Date('2026-09-09T12:00:00');

async function pickExport(page: Page, text: string, name = 'result.json'): Promise<void> {
  await page.locator('app-telegram-import-page input[type="file"]').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(text, 'utf8'),
  });
}

test.describe('Telegram scores import', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW);
    await page.goto('/dashboard');
    await expect(page.locator('app-balance-widget')).toBeVisible();
    await putRows(page, {
      users: [userRow(7_000)],
      dailyScores: [{ date: '2026-09-07', score: 5, rewardEarned: 0, streakAtThisDay: 0, createdAt: 1 }],
    });
    await page.goto('/settings');
    await page.getByRole('link', { name: 'Import Telegram scores' }).click();
    await expect(page).toHaveURL(/\/settings\/telegram-import$/);
  });

  test('should reject a file that is not a Telegram export and write nothing', async ({ page }) => {
    await pickExport(page, '{"hello":"world"}', 'other.json');

    await expect(page.getByRole('alert')).toHaveText(/This is not a Telegram chat export\./);
    await expect(page.locator('.import-button')).toHaveCount(0);
  });

  test(
    'should import scores, replace overlapping dates, keep the balance and set the high-score streak',
    { tag: '@smoke' },
    async ({ page }) => {
      const exportJson = JSON.stringify({
        messages: [
          { id: 1, type: 'message', date: '2026-09-05T22:00:00', text: '8/10' },
          { id: 2, type: 'message', date: '2026-09-06T22:00:00', text: '9/10' },
          { id: 3, type: 'message', date: '2026-09-07T22:00:00', text: '10/10' },
          { id: 4, type: 'message', date: '2026-09-08T22:00:00', text: '9/10' },
        ],
      });

      await pickExport(page, exportJson);
      await expect(page.locator('app-stat-card', { hasText: 'Scores to import' })).toContainText('3 new · 1 replaced');
      await expect(page.locator('app-stat-card', { hasText: 'Current streak' })).toContainText('3');

      await page.getByRole('button', { name: 'Import', exact: true }).click();

      await expect(page.locator('simple-snack-bar')).toContainText(
        'Imported 4 scores · 1 replaced · High-score streak: 3',
      );
      await expect(page).toHaveURL(/\/daily-scores$/);
      await expect(page.locator('app-stat-card', { hasText: 'Current streak' })).toContainText('3');
      expect(await readBalance(page)).toBe(7_000);
    },
  );
});
