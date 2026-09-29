import { test, expect } from '@playwright/test';

test.describe('Goals Flow', () => {
  test('should navigate to goals page and show predefined goals', async ({ page }) => {
    await page.goto('/goals');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Goals');
    await expect(page.locator('h2').first()).toContainText('Active goals');

    // Check for predefined goals
    await expect(page.getByText('do 50 push-ups on fists')).toBeVisible();
    await expect(page.getByText('do 100 squats')).toBeVisible();
    await expect(page.getByText('do 12 pomodoro a day')).toBeVisible();
  });

  test('should add a new goal', async ({ page }) => {
    await page.goto('/goals');

    // Click Add Goal
    await page.getByRole('button', { name: /Add Goal/i }).click();

    // Fill the form
    await page.getByPlaceholder('e.g. Read a book').fill('Playwright Test Goal');
    await page.locator('input[type="number"]').fill('500');

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify it was added
    await expect(page.getByText('Playwright Test Goal')).toBeVisible();
    const card = page.locator('app-goal-item', { hasText: 'Playwright Test Goal' });
    await expect(card.locator('app-amount')).toHaveText(/\+500\s*₴/);
  });
});
