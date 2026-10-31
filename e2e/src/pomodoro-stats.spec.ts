import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import type { Row } from './indexed-db';
import { putRows } from './indexed-db';

// Spec 013: the Today and History cards on a real IndexedDB, with the page's clock fixed. The unit
// specs mock Dexie, so only a browser shows that the query finds every session it should: one that
// crosses midnight, and one completed on reopening the app days after it started.

// A Friday, so the default 7 days run from Saturday 24 to Friday 30 October.
const NOW = new Date('2026-10-30T12:00:00');
const at = (dateTime: string) => new Date(dateTime).getTime();

let nextId = 0;
function session(startTime: string, endTime: string | null, extra: Row = {}): Row {
  return {
    id: `session-${String(nextId++)}`,
    durationMinutes: 25,
    engagementType: 'work',
    startTime: at(startTime),
    ...(endTime ? { endTime: at(endTime) } : {}),
    status: 'completed',
    rewardEarned: 100,
    ...extra,
  };
}

async function openWith(page: Page, sessions: Row[]): Promise<void> {
  await page.goto('/pomodoro');
  await expect(page.getByRole('button', { name: /^Start/ })).toBeEnabled();
  await putRows(page, { pomodoroSessions: sessions });
  await page.reload();
  // Not by role: a session whose time ran out completes on load, and its celebration dialog hides the
  // rest of the page from role queries.
  await expect(page.locator('app-timer-controls button')).toBeVisible();
}

const todayCard = (page: Page) => page.locator('app-pomodoro-today');
const historyCard = (page: Page) => page.locator('app-pomodoro-history');
const bars = (page: Page) => historyCard(page).locator('.chart-bar-group');

async function expectFigures(card: Locator, figures: RegExp[]): Promise<void> {
  for (const figure of figures) {
    await expect(card.locator('app-pomodoro-stats')).toContainText(figure);
  }
}

async function chooseCustomRange(page: Page, start: string, end: string): Promise<void> {
  const filter = historyCard(page).locator('app-period-filter');
  await filter.getByRole('radio', { name: 'Custom' }).click();
  await filter.getByPlaceholder('Start date').fill(start);
  await filter.getByPlaceholder('End date').fill(end);
  await filter.getByPlaceholder('End date').blur();
}

async function completeSessionNow(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  await page.clock.fastForward('25:00');
  await expect(page.locator('app-celebration-dialog')).toContainText('Pomodoro complete');
}

test.describe('Pomodoro stats', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  test.describe('Today card', () => {
    test(
      "should count today's completed sessions by type, with focus time and reward",
      { tag: '@smoke' },
      async ({ page }) => {
        await openWith(page, [
          session('2026-10-30T08:00:00', '2026-10-30T08:25:00'),
          session('2026-10-30T09:00:00', '2026-10-30T09:25:00'),
          session('2026-10-30T10:00:00', '2026-10-30T10:25:00'),
          session('2026-10-30T10:30:00', '2026-10-30T11:20:00', {
            durationMinutes: 50,
            engagementType: 'study',
            rewardEarned: 250,
          }),
          // Not counted: completed yesterday, and stopped today.
          session('2026-10-29T09:00:00', '2026-10-29T09:25:00'),
          session('2026-10-30T11:30:00', '2026-10-30T11:35:00', { status: 'cancelled', rewardEarned: undefined }),
        ]);

        await expectFigures(todayCard(page), [/^4 pomodoros/, /Work 3/, /Study 1/, /2 h 5 min focus/, /\+550\s*₴/]);
        await expect(todayCard(page).locator('.invitation')).toHaveCount(0);
      },
    );

    test('should show zero figures and an invitation on a day without pomodoros', async ({ page }) => {
      await openWith(page, [session('2026-10-29T09:00:00', '2026-10-29T09:25:00')]);

      await expectFigures(todayCard(page), [/^0 pomodoros/, /Work 0/, /Study 0/, /0 min focus/, /0\s*₴/]);
      await expect(todayCard(page).locator('.invitation')).toBeVisible();
    });

    test('should not count the session that is still running', async ({ page }) => {
      // Started five minutes ago, so the page restores it as running.
      await openWith(page, [
        session('2026-10-30T09:00:00', '2026-10-30T09:25:00'),
        session('2026-10-30T11:55:00', null, { status: 'active', rewardEarned: undefined }),
      ]);

      await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
      await expectFigures(todayCard(page), [/^1 pomodoro(?!s)/]);
    });

    test('should count a session on the day it was completed, not the day it started', async ({ page }) => {
      await openWith(page, [
        // Crosses midnight into today.
        session('2026-10-29T23:45:00', '2026-10-30T00:10:00'),
        // Its time ran out while the app was closed two days ago: reopening completes it today.
        session('2026-10-28T22:00:00', null, { status: 'active', rewardEarned: undefined }),
      ]);

      await expect(page.locator('app-celebration-dialog')).toContainText('Pomodoro complete');
      await expectFigures(todayCard(page), [/^2 pomodoros/, /Work 2/]);
      await expect(bars(page).last()).toHaveAttribute('aria-label', '2026-10-30: 2 pomodoros');
      await expect(bars(page).nth(-2)).toHaveAttribute('aria-label', '2026-10-29: 0 pomodoros');
      await expect(bars(page).nth(-3)).toHaveAttribute('aria-label', '2026-10-28: 0 pomodoros');
    });

    test('should count a session that completes with the page open within a second', async ({ page }) => {
      await openWith(page, [session('2026-10-30T09:00:00', '2026-10-30T09:25:00')]);
      await expectFigures(todayCard(page), [/^1 pomodoro(?!s)/]);

      await completeSessionNow(page);

      // SC-004: within one second of the completion being announced.
      await expect(todayCard(page).locator('app-pomodoro-stats')).toContainText(/^2 pomodoros/, { timeout: 1000 });
      await expectFigures(todayCard(page), [/Work 2/, /50 min focus/, /\+200\s*₴/]);
      // History scenario 7: today's bar grows too.
      await expect(bars(page).last()).toHaveAttribute('aria-label', '2026-10-30: 2 pomodoros');
    });

    test('should show the same reward as the pomodoro earnings on the Today page', async ({ page }) => {
      await openWith(page, [
        session('2026-10-29T23:45:00', '2026-10-30T00:10:00', { rewardEarned: 140 }),
        session('2026-10-30T09:00:00', '2026-10-30T09:50:00', { durationMinutes: 50, rewardEarned: 260 }),
        session('2026-10-29T09:00:00', '2026-10-29T09:25:00', { rewardEarned: 1000 }),
      ]);
      await expectFigures(todayCard(page), [/\+400\s*₴/]);

      // SC-003: the pomodoro share of today's bar in the earnings chart.
      await page.goto('/dashboard');
      const earnings = page.locator('app-earnings-chart');
      await earnings.locator('.chart-bar-group').last().hover();
      const pomodoroRow = earnings.locator('.chart-tooltip .tooltip-row').filter({ hasText: 'Pomodoro' });
      await expect(pomodoroRow.locator('app-amount')).toHaveText(/^400\s*₴$/);
    });
  });

  test.describe('History card', () => {
    const lastSevenDays = [
      session('2026-10-24T09:00:00', '2026-10-24T09:25:00'),
      session('2026-10-26T09:00:00', '2026-10-26T09:25:00'),
      session('2026-10-26T10:00:00', '2026-10-26T10:50:00', { durationMinutes: 50, engagementType: 'study' }),
      session('2026-10-30T09:00:00', '2026-10-30T09:25:00'),
    ];
    // Inside the last 30 days but not the last 7, and one before them both.
    const earlier = [
      session('2026-10-01T09:00:00', '2026-10-01T09:25:00'),
      session('2026-10-10T09:00:00', '2026-10-10T09:25:00', { engagementType: 'study' }),
      session('2026-09-30T09:00:00', '2026-09-30T09:25:00'),
    ];

    test('should show the last 7 days by default, one position per day', async ({ page }) => {
      await openWith(page, [...lastSevenDays, ...earlier]);

      await expectFigures(historyCard(page), [/^4 pomodoros/, /Work 3/, /Study 1/, /2 h 5 min focus/, /\+400\s*₴/]);
      await expect(bars(page)).toHaveCount(7);
      const labels = await bars(page).evaluateAll((groups) => groups.map((g) => g.getAttribute('aria-label')));
      expect(labels).toEqual([
        '2026-10-24: 1 pomodoro',
        '2026-10-25: 0 pomodoros',
        '2026-10-26: 2 pomodoros',
        '2026-10-27: 0 pomodoros',
        '2026-10-28: 0 pomodoros',
        '2026-10-29: 0 pomodoros',
        '2026-10-30: 1 pomodoro',
      ]);
      // An empty day keeps its position, drawn as the zero bar.
      await expect(bars(page).nth(1).locator('.zero-bar')).toHaveCount(1);
      await expect(bars(page).nth(1).locator('.bar-segment')).toHaveCount(0);
    });

    test('should cover the last 30 days, and a custom range with both of its ends', async ({ page }) => {
      await openWith(page, [...lastSevenDays, ...earlier]);

      await historyCard(page).getByRole('radio', { name: '30 days' }).click();
      await expect(bars(page)).toHaveCount(30);
      await expectFigures(historyCard(page), [/^6 pomodoros/, /Work 4/, /Study 2/]);

      await chooseCustomRange(page, '9/30/2026', '10/10/2026');
      await expect(bars(page)).toHaveCount(11);
      await expectFigures(historyCard(page), [/^3 pomodoros/, /Work 2/, /Study 1/]);
      await expect(bars(page).first()).toHaveAttribute('aria-label', '2026-09-30: 1 pomodoro');
      await expect(bars(page).last()).toHaveAttribute('aria-label', '2026-10-10: 1 pomodoro');
    });

    test("should show a day's date, count and split in its tooltip", async ({ page }) => {
      await openWith(page, lastSevenDays);

      await bars(page).nth(2).hover();

      const tooltip = historyCard(page).locator('.chart-tooltip');
      await expect(tooltip.locator('.tooltip-title')).toHaveText('2026-10-26');
      await expect(tooltip.locator('.tooltip-row')).toHaveText([/Pomodoros\s*2/, /Work\s*1/, /Study\s*1/]);
    });

    test('should say so when no pomodoros were completed in the period', async ({ page }) => {
      await openWith(page, lastSevenDays);

      await chooseCustomRange(page, '9/1/2026', '9/15/2026');

      await expect(historyCard(page).locator('.empty')).toHaveText('No pomodoros were completed in this period.');
      await expect(historyCard(page).locator('app-pomodoro-history-chart')).toHaveCount(0);
      await expectFigures(historyCard(page), [/^0 pomodoros/, /Work 0/, /Study 0/]);
    });

    test('should chart a custom range longer than 90 days week by week', async ({ page }) => {
      await openWith(page, lastSevenDays);

      // Thursday 1 January to Friday 30 October: 303 days, so one bar per calendar week.
      await chooseCustomRange(page, '1/1/2026', '10/30/2026');

      await expect(historyCard(page).getByRole('region', { name: 'Weekly pomodoros chart' })).toBeVisible();
      await expect(bars(page)).toHaveCount(44);
      await expect(bars(page).last()).toHaveAttribute('aria-label', '2026-10-26 – 2026-10-30: 3 pomodoros');
      await expect(bars(page).nth(-2)).toHaveAttribute('aria-label', '2026-10-19 – 2026-10-25: 1 pomodoro');
      await expectFigures(historyCard(page), [/^4 pomodoros/]);
    });

    test('should switch periods within a second with two years of sessions', async ({ page }) => {
      // About four sessions a day for two years: 3,000 in all, at 10:00 on each day.
      const twoYears = Array.from({ length: 3000 }, (_, i) => {
        const startTime = new Date(2026, 9, 30 - (i % 730), 10).getTime();
        return { ...session('2026-10-30T10:00:00', null), startTime, endTime: startTime + 25 * 60_000 };
      });
      await openWith(page, twoYears);
      // The 80 most recent days have five sessions, the rest four.
      await expectFigures(historyCard(page), [/^35 pomodoros/]);

      await historyCard(page).getByRole('radio', { name: '30 days' }).click();

      // SC-005.
      await expect(historyCard(page).locator('app-pomodoro-stats')).toContainText(/^150 pomodoros/, {
        timeout: 1000,
      });
      await expect(bars(page)).toHaveCount(30, { timeout: 1000 });
    });
  });
});

// SC-001: today's count and split are on the first screen of the smallest phone the app supports.
test.describe('Pomodoro stats on a phone', () => {
  test.use({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });

  test('should show the Today count and split without scrolling', async ({ page }) => {
    await page.clock.install({ time: NOW });
    await openWith(page, [session('2026-10-30T09:00:00', '2026-10-30T09:25:00')]);
    await expectFigures(todayCard(page), [/^1 pomodoro(?!s)/]);

    const nav = await page.locator('app-bottom-nav').boundingBox();
    if (!nav) throw new Error('The bottom navigation is not shown');
    expect(await page.locator('.scroller').evaluate((el) => el.scrollTop)).toBe(0);
    for (const figure of [todayCard(page).locator('.figure').first(), todayCard(page).locator('app-badge').last()]) {
      const box = await figure.boundingBox();
      if (!box) throw new Error('A Today figure is not shown');
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height, 'the figure ends above the bottom navigation').toBeLessThanOrEqual(nav.y);
    }
  });
});
