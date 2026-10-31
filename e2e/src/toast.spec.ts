import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

// A phone: the bottom nav and the speed dial are on screen, and input is touch.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const toast = (page: Page) => page.locator('.mat-mdc-snackbar-surface');

async function rect(locator: Locator): Promise<{ top: number; bottom: number; left: number; right: number }> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('element is not on screen');
  }
  return { top: box.y, bottom: box.y + box.height, left: box.x, right: box.x + box.width };
}

async function showToast(page: Page): Promise<void> {
  await page.goto('/tasks');
  await page.getByRole('tab', { name: /One-off/ }).click();
  await page.getByRole('button', { name: 'Add one-off task' }).click();
  const form = page.locator('app-task-form');
  await form.getByPlaceholder('e.g. Pay internet bill').fill('Pay internet bill');
  await form.getByLabel('Reward').fill('150');
  await form.getByRole('button', { name: 'Save task' }).click();
  await expect(page.locator('simple-snack-bar', { hasText: 'One-off task added' })).toBeVisible();
  // The toast takes gestures once it has finished opening, which is also when the speed dial moves up.
  await expect(page.locator('app-speed-dial')).toHaveAttribute('style', /translate/);
}

// Playwright can tap but not drag a finger, so the swipe goes through CDP as raw touch events.
async function swipe(page: Page, from: { x: number; y: number }, dx: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y: from.y }],
    });
  await touch('touchStart', from.x);
  for (let step = 1; step <= 6; step++) {
    await touch('touchMove', from.x + (dx * step) / 6);
  }
  await touch('touchEnd', from.x + dx);
}

test.describe('Toast on a phone', () => {
  test('should sit above the bottom nav and lift the speed dial above itself', async ({ page }) => {
    await showToast(page);

    const nav = await rect(page.locator('app-bottom-nav'));
    const surface = await rect(toast(page));
    expect(surface.bottom).toBeLessThanOrEqual(nav.top);
    await expect.poll(async () => (await rect(page.locator('app-speed-dial'))).bottom).toBeLessThanOrEqual(surface.top);
  });

  test('should leave the bottom nav usable while it shows', async ({ page }) => {
    await showToast(page);

    await page.locator('app-bottom-nav').getByText('Pomodoro').tap();

    await expect(page).toHaveURL(/\/pomodoro$/);
  });

  test('should be dismissed by a sideways swipe', async ({ page }) => {
    await showToast(page);
    const surface = await rect(toast(page));

    await swipe(page, { x: surface.left + 40, y: (surface.top + surface.bottom) / 2 }, 200);

    await expect(toast(page)).toHaveCount(0, { timeout: 1000 });
  });

  test('should stay after a short swipe', async ({ page }) => {
    await showToast(page);
    const surface = await rect(toast(page));

    await swipe(page, { x: surface.left + 40, y: (surface.top + surface.bottom) / 2 }, 30);

    await expect(toast(page)).toBeVisible();
    await expect(toast(page)).toHaveCSS('transform', 'none');
  });
});
