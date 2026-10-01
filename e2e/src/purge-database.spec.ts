import { test, expect } from '@playwright/test';

test.describe('Purge database', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/goals');
    await page.getByRole('button', { name: /Add Goal/i }).click();
    await page.getByPlaceholder('e.g. Read a book').fill('Goal to be purged');
    await page.locator('input[type="number"]').fill('500');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Goal to be purged')).toBeVisible();
    await page.goto('/settings');
  });

  test('should keep the data when the user cancels', async ({ page }) => {
    await page.getByRole('button', { name: 'Purge database' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await page.goto('/goals');
    await expect(page.getByText('Goal to be purged')).toBeVisible();
  });

  test('should delete user data, restore the defaults and go home without reloading', async ({ page }) => {
    await page.evaluate(() => {
      (window as unknown as { survivesNavigation: boolean }).survivesNavigation = true;
    });

    await page.getByRole('button', { name: 'Purge database' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Purge' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    expect(await page.evaluate(() => (window as unknown as { survivesNavigation?: boolean }).survivesNavigation)).toBe(
      true,
    );

    await page.getByRole('link', { name: /Goals/i }).first().click();
    await expect(page.getByText('do 100 squats')).toBeVisible();
    await expect(page.getByText('Goal to be purged')).toHaveCount(0);
  });
});
