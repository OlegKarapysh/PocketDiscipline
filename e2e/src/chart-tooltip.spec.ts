import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import type { Rows } from './indexed-db';
import { putRows, userRow } from './indexed-db';

// A bar's tooltip opens next to the pointer, or on a phone where the bar was tapped. The outermost
// bars sit at the screen's edges, and a bar low on the screen leaves little room below it, yet the
// whole tooltip has to stay on screen, also when the window narrows while it is open.

const NOW = new Date('2026-10-29T12:00:00');
const at = (date: string) => new Date(`${date}T12:00:00`).getTime();
// The first and last days of the default 7-day range. They earn from every source, so the earnings
// tooltip is at its tallest.
const DAYS = ['2026-10-23', '2026-10-29'];

const ROWS: Rows = {
  goals: DAYS.map((date) => ({
    id: `goal-${date}`,
    title: 'Finished a book',
    rewardValue: 100,
    status: 'COMPLETED',
    completedAt: at(date),
    createdAt: at(date),
  })),
  dailyScores: DAYS.map((date) => ({ date, score: 9, rewardEarned: 50, streakAtThisDay: 1, createdAt: at(date) })),
  pomodoroSessions: DAYS.map((date) => ({
    id: `session-${date}`,
    durationMinutes: 25,
    engagementType: 'work',
    startTime: at(date),
    endTime: at(date),
    status: 'completed',
    rewardEarned: 25,
  })),
  dailyTaskCompletions: DAYS.map((date) => ({
    id: `completion-${date}`,
    taskId: 'daily-gone',
    date,
    difficultyId: 'easy',
    rewardEarned: 13,
    completedAt: at(date),
  })),
};

// Scrolls the bar's foot down to whatever is fixed below it, the bottom navigation or the speed dial,
// as far as the page scrolls: the lowest point the bar can be pointed at.
async function scrollBarToFloor(bar: Locator): Promise<void> {
  await bar.evaluate((group) => {
    const hitbox = group.querySelector('.bar-hitbox')?.getBoundingClientRect();
    if (!hitbox) throw new Error('the bar is not rendered');
    const centre = hitbox.left + hitbox.width / 2;
    const floor = Math.min(
      ...['app-bottom-nav', 'app-speed-dial'].flatMap((selector) => {
        const fixed = document.querySelector(selector)?.getBoundingClientRect();
        return fixed && fixed.left <= centre && centre <= fixed.right ? [fixed.top] : [];
      }),
    );
    group.closest('.scroller')?.scrollBy(0, hitbox.bottom - floor);
  });
}

// The foot of the bar, relative to its group: the stacked segments cover the hit box above it.
async function barFoot(bar: Locator): Promise<{ x: number; y: number }> {
  const group = await bar.boundingBox();
  const hitbox = await bar.locator('.bar-hitbox').boundingBox();
  if (!group || !hitbox) throw new Error('the bar is not rendered');
  return { x: hitbox.x - group.x + hitbox.width / 2, y: hitbox.y - group.y + hitbox.height - 4 };
}

async function expectOnScreen(page: Page, element: Locator): Promise<void> {
  const box = await element.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error('the tooltip is not rendered');
  expect(box.x, 'left edge').toBeGreaterThanOrEqual(0);
  expect(box.y, 'top edge').toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, 'right edge').toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height, 'bottom edge').toBeLessThanOrEqual(viewport.height);
}

const CHARTS = [
  { name: 'earnings', path: '/dashboard', selector: 'app-earnings-chart' },
  { name: 'scores', path: '/daily-scores', selector: 'app-scores-chart' },
];

const BARS = [
  { name: 'first', index: 0 },
  { name: 'last', index: -1 },
];

async function seed(page: Page): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await page.goto('/dashboard');
  await expect(page.locator('app-balance-widget')).toBeVisible();
  await putRows(page, { users: [userRow(0)], ...ROWS });
}

test.describe('Chart tooltip on a phone-width screen', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test.beforeEach(async ({ page }) => {
    await seed(page);
  });

  for (const chart of CHARTS) {
    for (const bar of BARS) {
      test(`should keep the ${chart.name} tooltip on screen for the ${bar.name} bar`, async ({ page }) => {
        await page.goto(chart.path);
        const chartElement = page.locator(chart.selector);
        const bars = chartElement.locator('.chart-bar-group');
        await expect(bars).toHaveCount(7);

        await scrollBarToFloor(bars.nth(bar.index));
        await bars.nth(bar.index).hover({ position: await barFoot(bars.nth(bar.index)) });

        const tooltip = chartElement.locator('.chart-tooltip');
        await expect(tooltip).toBeVisible();
        await expectOnScreen(page, tooltip);
      });
    }
  }
});

test.describe('Chart tooltip on a touch screen', () => {
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await seed(page);
  });

  for (const chart of CHARTS) {
    test(`should open the ${chart.name} tooltip with one tap and close it with another`, async ({ page }) => {
      await page.goto(chart.path);
      const chartElement = page.locator(chart.selector);
      const bars = chartElement.locator('.chart-bar-group');
      const tooltip = chartElement.locator('.chart-tooltip');
      await expect(bars).toHaveCount(7);

      await bars.last().tap({ position: await barFoot(bars.last()) });
      await expect(tooltip).toContainText(DAYS[1]);

      await bars.first().tap({ position: await barFoot(bars.first()) });
      await expect(tooltip).toContainText(DAYS[0]);

      await bars.first().tap({ position: await barFoot(bars.first()) });
      await expect(tooltip).toBeHidden();
    });
  }
});

test.describe('Chart tooltip when the window narrows', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('should move a tooltip that is open back on screen', async ({ page }) => {
    await page.clock.setFixedTime(NOW);
    await page.goto('/daily-scores');
    const chart = page.locator('app-scores-chart');
    // Keyboard focus keeps the tooltip open while the window changes under it.
    await chart.locator('.chart-bar-group').nth(-2).focus();
    await page.keyboard.press('Tab');
    const tooltip = chart.locator('.chart-tooltip');
    await expect(tooltip).toBeVisible();

    await page.setViewportSize({ width: 600, height: 800 });

    await expect(tooltip).toBeVisible();
    await expect(() => expectOnScreen(page, tooltip)).toPass();
  });
});
