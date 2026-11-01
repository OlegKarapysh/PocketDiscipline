import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { readBalance, readStores } from './indexed-db';

// A whole session on a real IndexedDB, without waiting for it: the page's clock is fast-forwarded
// past the end, and the earned amount must reach the stored balance.

// The default session: 25 minutes of work.
const SESSION = '25:00';

async function completeSession(page: Page): Promise<void> {
  if (!page.url().includes('/pomodoro')) {
    await page.goto('pomodoro');
  }
  const start = page.getByRole('button', { name: /^Start/ });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  await page.clock.fastForward(SESSION);
}

test.describe('Pomodoro', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-03-10T09:00:00') });
  });

  test('should pay a completed session into the balance', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('pomodoro');
    await expect(page.getByRole('button', { name: /^Start/ })).toBeEnabled();
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
    await page.goto('settings');
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
    await page.goto('pomodoro');
    await expect(page.getByRole('button', { name: /^Start/ })).toBeEnabled();
    const balance = await readBalance(page);

    await page.getByRole('radio', { name: 'Study' }).click();

    await completeSession(page);

    const celebration = page.locator('app-celebration-dialog');
    await expect(celebration).toContainText('Pomodoro complete');
    await expect(celebration.locator('app-amount')).toHaveText(/^\+125\s*₴$/);
    await expect.poll(() => readBalance(page)).toBe(balance + 125);
    const { pomodoroSessions } = await readStores(page, ['pomodoroSessions']);
    expect(pomodoroSessions).toEqual([expect.objectContaining({ status: 'completed', rewardEarned: 125 })]);
  });
});

// Spec 005, User Story 3: the compact page on the smallest phone the app supports.
test.describe('Pomodoro on a phone', () => {
  test.use({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });

  // The Today card of spec 013 and the gap above it: about 120px of figures on one wrapping row.
  const TODAY_CARD_ROOM = 136;

  // Every control and figure on the page, the statistics of spec 013 included. Content may pass beneath
  // the quick actions button while the page scrolls, but none of it may be under the button on the first
  // screen or once the page is scrolled to the bottom (FR-014).
  async function expectQuickActionsClear(page: Page): Promise<void> {
    const fab = await page.getByRole('button', { name: 'Quick actions' }).boundingBox();
    if (!fab) throw new Error('The quick actions button is not shown');
    const scroller = page.locator('.scroller');
    const maxScroll = await scroller.evaluate((el) => el.scrollHeight - el.clientHeight);
    const targets = page
      .locator('main')
      .locator(
        'button, [role="radio"], app-timer-display, .value, .summary, app-pomodoro-stats > *, ' +
          'app-pomodoro-history .empty, app-pomodoro-history-chart',
      );

    for (const scrollTop of [0, maxScroll]) {
      await scroller.evaluate((el, top) => el.scrollTo(0, top), scrollTop);
      const boxes = await targets.evaluateAll((els) =>
        els.map((el) => ({ text: el.textContent.trim(), rect: el.getBoundingClientRect().toJSON() as DOMRect })),
      );
      for (const { text, rect } of boxes) {
        const covered =
          rect.left < fab.x + fab.width && rect.right > fab.x && rect.top < fab.y + fab.height && rect.bottom > fab.y;
        expect(covered, `"${text}" is under the quick actions button at scroll ${String(scrollTop)}`).toBe(false);
      }
    }
  }

  test('should set up, start and stop a session with taps only', async ({ page }) => {
    await page.goto('pomodoro');
    const start = page.getByRole('button', { name: /^Start/ });
    await expect(start).toBeEnabled();

    // Scenario 1 and SC-004: one card right below the title, with room under it for the Today card.
    const card = page.locator('app-section-card').filter({ has: page.locator('app-timer-display') });
    for (const part of [page.locator('app-timer-display'), page.getByRole('radio', { name: 'Work' }), start]) {
      await expect(card.locator(part)).toBeVisible();
    }
    const header = await page.locator('app-page-header').boundingBox();
    const cardBox = await card.boundingBox();
    const nav = await page.locator('app-bottom-nav').boundingBox();
    if (!header || !cardBox || !nav) throw new Error('The page did not render');
    expect(cardBox.y - (header.y + header.height)).toBeLessThanOrEqual(24);
    expect(cardBox.y + cardBox.height + TODAY_CARD_ROOM).toBeLessThanOrEqual(nav.y);

    // Scenario 2: both types side by side, one tap, no list.
    const work = page.getByRole('radio', { name: 'Work' });
    const study = page.getByRole('radio', { name: 'Study' });
    await study.click();
    await expect(study).toBeChecked();
    await expect(work).toBeVisible();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await work.click();

    // Scenario 3.
    const increase = page.getByRole('button', { name: 'Increase duration' });
    const decrease = page.getByRole('button', { name: 'Decrease duration' });
    const timer = page.locator('app-timer-display');
    await increase.click();
    await expect(timer).toHaveText('30:00');

    // Scenario 5: 50 minutes of work pays twice the default 100 ₴ rate, study twice 125 ₴.
    for (let minutes = 30; minutes < 50; minutes += 5) {
      await increase.click();
    }
    await expect(timer).toHaveText('50:00');
    await expect(start).toHaveText(/Start\s*\+200\s*₴/);
    await study.click();
    await expect(start).toHaveText(/Start\s*\+250\s*₴/);

    // Scenario 4.
    for (let minutes = 50; minutes < 120; minutes += 5) {
      await increase.click();
    }
    await expect(increase).toBeDisabled();
    await expect(decrease).toBeEnabled();
    for (let minutes = 120; minutes > 15; minutes -= 5) {
      await decrease.click();
    }
    await expect(decrease).toBeDisabled();
    await expect(increase).toBeEnabled();
    await expect(timer).toHaveText('15:00');

    // SC-005: nothing on the page takes typing.
    await expect(page.locator('main').getByRole('textbox')).toHaveCount(0);
    await expect(page.locator('main').getByRole('spinbutton')).toHaveCount(0);
    await expectQuickActionsClear(page);

    // Scenario 6: one line names the session, and Stop takes Start's place.
    await start.click();
    const stop = page.getByRole('button', { name: 'Stop' });
    await expect(stop).toBeVisible();
    await expect(page.locator('app-session-config')).toHaveText('Study · 15 min');
    await expect(card.getByRole('radio')).toHaveCount(0);
    await expect(start).toHaveCount(0);
    await expectQuickActionsClear(page);

    await stop.click();
    await page.locator('app-confirm-dialog').getByRole('button', { name: 'Stop session' }).click();
    await expect(start).toBeEnabled();
    await expect(timer).toHaveText('15:00');
  });
});
