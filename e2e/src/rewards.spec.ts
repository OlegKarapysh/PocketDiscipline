import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { FALLBACK_CATEGORY_ID } from '../../src/app/core/constants/initial-reward-categories.const';
import { putRows, readBalance, readStores, userRow } from './indexed-db';

// Spending money on a real IndexedDB: claiming a reward, a quick spend, reverting a withdrawal and
// deleting a reward, each checked against the stored balance.

const START_BALANCE = 1000;

const reward = {
  id: 'reward-cinema',
  title: 'Cinema night',
  cost: 300,
  categoryId: FALLBACK_CATEGORY_ID,
  type: 'repeatable',
  status: 'active',
  claimCount: 0,
  claimedAt: null,
  createdAt: 1,
  updatedAt: 1,
};

const withdrawal = {
  id: 'spend-coffee',
  amount: 50,
  title: 'Old coffee',
  categoryId: FALLBACK_CATEGORY_ID,
  date: '2026-01-01',
  timestamp: 1,
  rewardId: null,
};

const rewardCard = (page: Page) => page.locator('app-reward-card', { hasText: reward.title });
const confirmDialog = (page: Page) => page.locator('app-confirm-dialog');

async function openHistory(page: Page): Promise<void> {
  await page.getByRole('tab', { name: /History/ }).click();
}

test.describe('Rewards: money out and back', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rewards');
    await expect(page.locator('app-reward-store')).toBeVisible();
    await putRows(page, { users: [userRow(START_BALANCE)], rewards: [reward], withdrawals: [withdrawal] });
    await page.reload();
    await expect(rewardCard(page)).toBeVisible();
  });

  test('should take the cost off the balance when a reward is claimed', async ({ page }) => {
    await rewardCard(page).getByRole('button', { name: 'Claim reward' }).click();

    await expect(rewardCard(page).getByText('Claimed 1x')).toBeVisible();
    await expect.poll(() => readBalance(page)).toBe(700);
    await openHistory(page);
    await expect(
      page.locator('.ledger-item', { hasText: `Claimed: ${reward.title}` }).locator('app-amount'),
    ).toHaveText(/^-300\s*₴$/);
  });

  test('should record a quick spend and take it off the balance', async ({ page }) => {
    await page.locator('app-rewards-hub').getByRole('button', { name: 'Quick spend' }).click();
    const dialog = page.locator('app-quick-spend-dialog');
    await dialog.getByPlaceholder('0', { exact: true }).fill('120');
    await dialog.getByPlaceholder('e.g. Protein bar, coffee, lunch').fill('Lunch');
    await dialog.getByRole('button', { name: 'Withdraw' }).click();

    await expect(dialog).toBeHidden();
    await expect.poll(() => readBalance(page)).toBe(880);
    await openHistory(page);
    await expect(page.locator('.ledger-item', { hasText: 'Lunch' }).locator('app-amount')).toHaveText(/^-120\s*₴$/);
  });

  test('should spend 100 ₴ down to exactly zero: 99 ₴, then 1 ₴', async ({ page }) => {
    await putRows(page, { users: [userRow(100)] });
    await page.reload();
    const dialog = page.locator('app-quick-spend-dialog');
    for (const [amount, title] of [
      ['99', 'Dinner'],
      ['1', 'Gum'],
    ]) {
      await page.locator('app-rewards-hub').getByRole('button', { name: 'Quick spend' }).click();
      await dialog.getByPlaceholder('0', { exact: true }).fill(amount);
      await dialog.getByPlaceholder('e.g. Protein bar, coffee, lunch').fill(title);
      await dialog.getByRole('button', { name: 'Withdraw' }).click();
      await expect(dialog).toBeHidden();
    }

    await expect.poll(() => readBalance(page)).toBe(0);
  });

  test('should refund a withdrawal only once the revert is confirmed', async ({ page }) => {
    await openHistory(page);
    const item = page.locator('.ledger-item', { hasText: withdrawal.title });
    const revert = item.getByRole('button', { name: 'Revert withdrawal and refund balance' });

    await revert.click();
    await confirmDialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(confirmDialog(page)).toBeHidden();
    await expect(item).toBeVisible();
    expect(await readBalance(page)).toBe(START_BALANCE);

    await revert.click();
    await confirmDialog(page).getByRole('button', { name: 'Revert & refund' }).click();

    await expect(item).toBeHidden();
    await expect.poll(() => readBalance(page)).toBe(1050);
    const { withdrawals } = await readStores(page, ['withdrawals']);
    expect(withdrawals).toEqual([]);
  });

  test('should delete a reward through its confirm dialog and leave the balance alone', async ({ page }) => {
    await rewardCard(page).getByRole('button', { name: 'Reward options' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(confirmDialog(page)).toContainText(reward.title);
    await confirmDialog(page).getByRole('button', { name: 'Delete' }).click();

    await expect(rewardCard(page)).toBeHidden();
    await expect.poll(async () => (await readStores(page, ['rewards']))['rewards']).toEqual([]);
    expect(await readBalance(page)).toBe(START_BALANCE);
  });
});
