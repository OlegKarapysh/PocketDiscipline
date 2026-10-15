import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { readBalance, readStores } from './indexed-db';

// A whole session on a real IndexedDB, without waiting for it: the page's clock is fast-forwarded
// past the end, and the earned amount must reach the stored balance.

// The default session: 25 minutes of work.
const SESSION = '25:00';

async function completeSession(page: Page): Promise<void> {
  if (!page.url().includes('/pomodoro')) {
    await page.goto('/pomodoro');
  }
  const start = page.getByRole('button', { name: 'Start Timer' });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByRole('button', { name: 'Stop Timer' })).toBeVisible();
  await page.clock.fastForward(SESSION);
}

test.describe('Pomodoro', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-03-10T09:00:00') });
  });

  test('should pay a completed session into the balance', async ({ page }) => {
    await page.goto('/pomodoro');
    await expect(page.getByRole('button', { name: 'Start Timer' })).toBeEnabled();
    const balance = await readBalance(page);

    await completeSession(page);

    // A work session pays 100 ₴ until the rate is changed in Settings.
    const celebration = page.locator('app-celebration-dialog');
    await expect(celebration).toContainText('Pomodoro complete');
    await expect(celebration.locator('app-amount')).toHaveText(/^\+100\s*₴$/);
    await expect.poll(() => readBalance(page)).toBe(balance + 100);
    const { pomodoroSessions } = await readStores(page, ['pomodoroSessions']);
    expect(pomodoroSessions).toEqual([expect.objectContaining({ status: 'completed', rewardEarned: 100 })]);
  });

  test('should pay the work rate set in Settings', async ({ page }) => {
    await page.goto('/settings');
    const work = page.getByLabel('Work');
    await expect(work).toHaveValue('100');
    await expect(page.getByLabel('Study')).toHaveValue('125');
    await work.fill('40');
    await page.getByRole('button', { name: 'Save rewards' }).click();
    await expect(page.getByText('Pomodoro rewards saved.')).toBeVisible();
    const balance = await readBalance(page);

    await completeSession(page);

    await expect(page.locator('app-celebration-dialog app-amount')).toHaveText(/^\+40\s*₴$/);
    await expect.poll(() => readBalance(page)).toBe(balance + 40);
  });

  test('should pay the default study rate for a study session', async ({ page }) => {
    await page.goto('/pomodoro');
    await expect(page.getByRole('button', { name: 'Start Timer' })).toBeEnabled();
    const balance = await readBalance(page);

    await page.getByLabel('Engagement type').click();
    await page.getByRole('option', { name: 'Study' }).click();

    await completeSession(page);

    const celebration = page.locator('app-celebration-dialog');
    await expect(celebration).toContainText('Pomodoro complete');
    await expect(celebration.locator('app-amount')).toHaveText(/^\+125\s*₴$/);
    await expect.poll(() => readBalance(page)).toBe(balance + 125);
    const { pomodoroSessions } = await readStores(page, ['pomodoroSessions']);
    expect(pomodoroSessions).toEqual([expect.objectContaining({ status: 'completed', rewardEarned: 125 })]);
  });
});
