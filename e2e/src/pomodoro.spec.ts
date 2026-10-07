import { expect, test } from '@playwright/test';
import { readBalance, readStores } from './indexed-db';

// A whole session on a real IndexedDB, without waiting for it: the page's clock is fast-forwarded
// past the end, and the earned amount must reach the stored balance.

// The default session: 25 minutes of work pays 25 ₴.
const SESSION = '25:00';
const REWARD = 25;

test.describe('Pomodoro', () => {
  test('should pay a completed session into the balance', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-03-10T09:00:00') });
    await page.goto('/pomodoro');
    const start = page.getByRole('button', { name: 'Start Timer' });
    await expect(start).toBeEnabled();
    const balance = await readBalance(page);

    await start.click();
    await expect(page.getByRole('button', { name: 'Stop Timer' })).toBeVisible();
    await page.clock.fastForward(SESSION);

    const celebration = page.locator('app-celebration-dialog');
    await expect(celebration).toContainText('Pomodoro complete');
    await expect(celebration.locator('app-amount')).toHaveText(/^\+25\s*₴$/);
    await expect.poll(() => readBalance(page)).toBe(balance + REWARD);
    const { pomodoroSessions } = await readStores(page, ['pomodoroSessions']);
    expect(pomodoroSessions).toEqual([expect.objectContaining({ status: 'completed', rewardEarned: REWARD })]);
  });
});
