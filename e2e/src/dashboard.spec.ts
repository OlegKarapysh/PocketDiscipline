import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { putRows, userRow } from './indexed-db';

// The dashboard totals over known earnings on a real IndexedDB: one of each source this month, and
// one last month that must stay out of this month's total.

// The tenth of March, so the month's "per day" average divides by 10.
const NOW = new Date('2026-03-10T12:00:00');
const at = (day: string) => new Date(`2026-${day}T12:00:00`).getTime();

const EARNINGS = {
  goals: [
    {
      id: 'goal-march',
      title: 'Finished a book',
      rewardValue: 100,
      status: 'COMPLETED',
      completedAt: at('03-02'),
      createdAt: at('03-01'),
    },
    {
      id: 'goal-february',
      title: 'Ran a half marathon',
      rewardValue: 400,
      status: 'COMPLETED',
      completedAt: at('02-15'),
      createdAt: at('02-01'),
    },
  ],
  dailyScores: [{ date: '2026-03-05', score: 8, rewardEarned: 50, streakAtThisDay: 1, createdAt: at('03-05') }],
  pomodoroSessions: [
    {
      id: 'session-march',
      durationMinutes: 25,
      engagementType: 'work',
      startTime: at('03-09'),
      endTime: at('03-09'),
      status: 'completed',
      rewardEarned: 25,
    },
  ],
  dailyTaskCompletions: [
    {
      id: 'completion-march',
      taskId: 'daily-gone',
      date: '2026-03-10',
      difficultyId: 'easy',
      rewardEarned: 13,
      completedAt: at('03-10'),
    },
  ],
};

const stat = (page: Page, label: string) => page.locator('app-stat-card', { hasText: label }).locator('app-amount');

test.describe('Dashboard totals', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW);
    await page.goto('/dashboard');
    await expect(page.locator('app-stat-card').first()).toBeVisible();
    await putRows(page, { users: [userRow(12_345)], ...EARNINGS });
    await page.reload();
  });

  test('should show the balance and add up every source of this month', async ({ page }) => {
    await expect(page.locator('app-balance-widget app-amount')).toHaveText(/^12\s345\s*₴$/);
    await expect(page.locator('app-earnings-stats .month-label')).toHaveText('March 2026');
    // 100 + 50 + 25 + 13 ₴, over the 10 days so far: 18,8 rounds to 19.
    await expect(stat(page, 'Total earned')).toHaveText(/^188\s*₴$/);
    await expect(stat(page, 'Daily average')).toHaveText(/^19\s*₴\/day$/);
  });

  test('should show last month on its own', async ({ page }) => {
    await page.getByRole('button', { name: 'Previous month' }).click();

    await expect(page.locator('app-earnings-stats .month-label')).toHaveText('February 2026');
    // 400 ₴ over all 28 days: 14,29 rounds to 14.
    await expect(stat(page, 'Total earned')).toHaveText(/^400\s*₴$/);
    await expect(stat(page, 'Daily average')).toHaveText(/^14\s*₴\/day$/);
  });
});
