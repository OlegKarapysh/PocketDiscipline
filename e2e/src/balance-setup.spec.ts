import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { openDialog } from './dialog';

const setUpButton = (page: Page) => page.getByRole('button', { name: 'Set up balance' });
const balanceInput = (page: Page) => page.locator('app-balance-setup-dialog').getByLabel('Balance');

const setUpBalance = async (page: Page, amount: string) => {
  await openDialog(setUpButton(page), balanceInput(page));
  await balanceInput(page).fill(amount);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('app-confirm-dialog').getByRole('button', { name: 'Set balance' }).click();
};

test.describe('Balance setup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('settings');
  });

  test('should replace the balance once and then no longer be offered', { tag: '@smoke' }, async ({ page }) => {
    await setUpBalance(page, '4321');

    await expect(page.locator('simple-snack-bar', { hasText: /Balance set to 4\s321/ })).toBeVisible();
    await expect(setUpButton(page)).toHaveCount(0);

    await page.goto('dashboard');
    await expect(page.locator('app-balance-widget')).toContainText(/4\s321/);

    await page.goto('settings');
    await expect(page.getByRole('button', { name: 'Purge database' })).toBeVisible();
    await expect(setUpButton(page)).toHaveCount(0);
  });

  test('should leave the balance alone when the confirmation is cancelled', async ({ page }) => {
    await openDialog(setUpButton(page), balanceInput(page));
    await balanceInput(page).fill('4321');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.locator('app-confirm-dialog').getByRole('button', { name: 'Cancel' }).click();

    await expect(setUpButton(page)).toBeVisible();
    await page.goto('dashboard');
    await expect(page.locator('app-balance-widget')).not.toContainText(/4\s321/);
  });

  test('should be offered again after the database is purged', async ({ page }) => {
    await setUpBalance(page, '4321');
    await expect(setUpButton(page)).toHaveCount(0);

    await page.getByRole('button', { name: 'Purge database' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Purge' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('settings');
    await expect(setUpButton(page)).toBeVisible();
  });
});
