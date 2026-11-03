import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import type { BackupEnvelope } from '../../src/app/features/backup/models/backup-envelope.model';
import { putRows, readStores, userRow } from './indexed-db';

declare global {
  interface Window {
    backupSharedFiles: File[];
  }
}

async function stubShare(page: Page, outcomes: string[]): Promise<void> {
  await page.addInitScript((results) => {
    window.backupSharedFiles = [];
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: ({ files }: ShareData) => {
        window.backupSharedFiles.push(files![0]);
        const outcome = results.shift();
        return outcome && outcome !== 'shared'
          ? Promise.reject(new DOMException('Share rejected', outcome))
          : Promise.resolve();
      },
    });
  }, outcomes);
}

test.describe('Backup export', () => {
  test('downloads every store with a versioned envelope and records today', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('settings');
    await expect(page.getByText('Last backup: Never')).toBeVisible();
    await putRows(page, {
      users: [userRow(4321)],
      goals: [{ id: 'jar-202609081930-123450', title: 'Learn', rewardValue: 20, status: 'ACTIVE', createdAt: 1 }],
      dailyScores: [{ date: '2025-01-01', score: 8, rewardEarned: 30, streakAtThisDay: 1, createdAt: 1 }],
      pomodoroRewardRates: [{ engagementType: 'study', baseReward: 175 }],
    });
    await page.reload();
    const names = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('pocket-discipline-db');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Cannot open database'));
      });
      const stores = Array.from(db.objectStoreNames);
      db.close();
      return stores;
    });
    const before = await readStores(page, names);
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export data' }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(/^pocket-discipline-\d{4}-\d{2}-\d{2}-\d{4}\.txt$/);
    const path = await download.path();
    const envelope = JSON.parse(await readFile(path, 'utf8')) as BackupEnvelope;
    expect(envelope).toMatchObject({
      format: 'pocket-discipline-backup',
      formatVersion: 1,
      schemaVersion: 11,
      encrypted: false,
    });
    expect(Object.keys(envelope.data).sort()).toEqual(names.sort());
    expect(envelope.data).toEqual(before);
    await expect(page.getByText('Last backup: today')).toBeVisible();
  });

  test('shares and records today', async ({ page }) => {
    await stubShare(page, ['shared']);
    await page.goto('settings');
    await page.getByRole('button', { name: 'Export data' }).click();
    await expect(page.locator('simple-snack-bar')).toContainText('Backup shared.');
    await expect(page.getByText('Last backup: today')).toBeVisible();
  });

  test('cancels silently and leaves Never unchanged', async ({ page }) => {
    await stubShare(page, ['AbortError']);
    await page.goto('settings');
    await page.getByRole('button', { name: 'Export data' }).click();
    await expect.poll(() => page.evaluate(() => window.backupSharedFiles.length)).toBe(1);
    await expect(page.getByRole('button', { name: 'Export data' })).toBeEnabled();
    await expect(page.locator('simple-snack-bar')).toHaveCount(0);
    await expect(page.getByText('Last backup: Never')).toBeVisible();
  });

  test('shares the same file on a fresh tap after activation expires', async ({ page }) => {
    await stubShare(page, ['NotAllowedError', 'shared']);
    await page.goto('settings');
    await page.getByRole('button', { name: 'Export data' }).click();
    await expect(page.getByText('Your backup is ready to share.')).toBeVisible();
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    await expect(page.locator('simple-snack-bar')).toContainText('Backup shared.');
    expect(
      await page.evaluate(
        () => window.backupSharedFiles.length === 2 && window.backupSharedFiles[0] === window.backupSharedFiles[1],
      ),
    ).toBe(true);
  });

  test('downloads explicitly even when sharing is supported', async ({ page }) => {
    await stubShare(page, ['shared']);
    await page.goto('settings');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download', exact: true }).click();
    await downloading;
    await expect(page.getByText('Last backup: today')).toBeVisible();
    expect(await page.evaluate(() => window.backupSharedFiles.length)).toBe(0);
  });

  test('exports while offline', async ({ page, context }) => {
    await page.goto('settings');
    await expect(page.getByText('Last backup: Never')).toBeVisible();
    await context.setOffline(true);
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export data' }).click();
    await downloading;
    await expect(page.getByText('Last backup: today')).toBeVisible();
  });

  test('shows three calendar days ago after a reload', async ({ page }) => {
    await page.goto('settings');
    await expect(page.getByText('Last backup: Never')).toBeVisible();
    const date = new Date();
    date.setDate(date.getDate() - 3);
    await putRows(page, { users: [{ ...userRow(100), lastExportedAt: date.getTime() }] });
    await page.reload();
    await expect(page.getByText('Last backup: 3 days ago')).toBeVisible();
  });

  test('resets the backup age after a purge', async ({ page }) => {
    await page.goto('settings');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download', exact: true }).click();
    await downloading;
    await expect(page.getByText('Last backup: today')).toBeVisible();
    await page.getByRole('button', { name: 'Purge database' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Purge', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('settings');
    await expect(page.getByText('Last backup: Never')).toBeVisible();
  });
});
