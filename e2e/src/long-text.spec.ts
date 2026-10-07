import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { DIFFICULTY_NAME_MAX_LENGTH, TITLE_MAX_LENGTH } from '../../src/app/shared/constants/text-length.const';

const PASTED = 'W'.repeat(3 * TITLE_MAX_LENGTH);

const sidewaysOverflow = (page: Page): Promise<number> =>
  page.locator('.scroller').evaluate((scroller) => scroller.scrollWidth - scroller.clientWidth);

test.describe('Long text on a phone', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('should cut a pasted goal title at the limit and wrap it inside the card', async ({ page }) => {
    await page.goto('/goals');
    await page.getByRole('button', { name: /Add Goal/i }).click();

    const title = page.getByPlaceholder('e.g. Read a book');
    await title.fill(PASTED);
    await expect(title).toHaveValue('W'.repeat(TITLE_MAX_LENGTH));

    await page.locator('input[type="number"]').fill('500');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.locator('app-goal-item', { hasText: 'WWWW' })).toBeVisible();
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('should cut a pasted daily task title and difficulty name and keep them inside the card', async ({ page }) => {
    await page.goto('/tasks');
    await page.getByRole('button', { name: /Add Daily Task/i }).click();

    const title = page.getByPlaceholder('e.g. Morning Workout');
    await title.fill(PASTED);
    await expect(title).toHaveValue('W'.repeat(TITLE_MAX_LENGTH));

    const difficultyName = page.getByPlaceholder('e.g. Easy').first();
    await difficultyName.fill(PASTED);
    await expect(difficultyName).toHaveValue('W'.repeat(DIFFICULTY_NAME_MAX_LENGTH));

    await page.getByRole('button', { name: /Save task/i }).click();

    const card = page.locator('app-daily-task-item', { hasText: 'WWWW' });
    await expect(card).toBeVisible();
    const spill = await card
      .locator('.pd-difficulty')
      .first()
      .evaluate((button) => {
        const text = document.createRange();
        text.selectNodeContents(button);
        return text.getBoundingClientRect().right - button.getBoundingClientRect().right;
      });
    expect(spill).toBeLessThanOrEqual(0);
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  });
});
