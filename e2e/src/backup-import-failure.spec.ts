import { test, expect } from '@playwright/test';
import { BACKUP_STORES, canonicalStores, importFile } from './backup-import.fixture';
import { readStores } from './indexed-db';
import { backupFixture } from '../../src/app/features/backup/testing/backup.fixture';

test('invalid content and missing category references preserve every store', async ({ page }) => {
  await page.goto('settings');
  await expect(page.locator('.last-backup')).toBeVisible();
  await page.getByRole('link', { name: 'Import data', exact: true }).click();
  const before = canonicalStores(await readStores(page, BACKUP_STORES));
  for (const value of [
    { wrong: true },
    { ...backupFixture(), data: { ...backupFixture().data, rewardCategories: [] } },
  ]) {
    await page.locator('app-data-import-page input[type="file"]').setInputFiles(importFile(value));
    await expect(page.getByRole('alert')).toBeVisible();
    expect(canonicalStores(await readStores(page, BACKUP_STORES))).toBe(before);
    await expect(page.getByRole('button', { name: 'Replace data', exact: true })).toHaveCount(0);
  }
});

test('native abort after a successful clear and insert restores every store immediately and after reload', async ({
  page,
}) => {
  await page.goto('pomodoro');
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Settings', exact: true }).first().click();
  await expect(page.locator('.last-backup')).toBeVisible();
  await page.getByRole('link', { name: 'Import data', exact: true }).click();
  await page.locator('app-data-import-page input[type="file"]').setInputFiles(importFile());
  await expect(page.getByRole('heading', { name: 'Review backup' })).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  await downloading;
  await expect(page.getByRole('button', { name: 'Replace data', exact: true })).toBeEnabled();
  const baseline = canonicalStores(await readStores(page, BACKUP_STORES));
  await page.evaluate(() => {
    const originalClear = IDBObjectStore.prototype.clear;
    const originalAdd = IDBObjectStore.prototype.add;
    const originalPut = IDBObjectStore.prototype.put;
    const state = { cleared: false, inserted: false, aborted: false };
    IDBObjectStore.prototype.clear = function () {
      const request = originalClear.call(this);
      request.addEventListener('success', () => {
        state.cleared = true;
      });
      return request;
    };
    function wrap(original: typeof originalAdd): typeof originalAdd {
      return function (this: IDBObjectStore, ...args: Parameters<typeof originalAdd>) {
        const request = original.apply(this, args);
        if (this.name === 'tasks')
          request.addEventListener('success', () => {
            if (state.cleared) {
              state.inserted = true;
              this.transaction.abort();
              state.aborted = true;
            }
          });
        return request;
      };
    }
    IDBObjectStore.prototype.add = wrap(originalAdd);
    IDBObjectStore.prototype.put = wrap(originalPut);
    Object.assign(window, {
      importFault: state,
      restoreImportFault: () => {
        IDBObjectStore.prototype.clear = originalClear;
        IDBObjectStore.prototype.add = originalAdd;
        IDBObjectStore.prototype.put = originalPut;
      },
    });
  });
  try {
    await page.getByRole('button', { name: 'Replace data', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Replace data', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Your data was preserved');
    expect(await page.evaluate(() => (window as unknown as { importFault: unknown }).importFault)).toEqual({
      cleared: true,
      inserted: true,
      aborted: true,
    });
    expect(canonicalStores(await readStores(page, BACKUP_STORES))).toBe(baseline);
  } finally {
    await page.evaluate(() => (window as unknown as { restoreImportFault: () => void }).restoreImportFault());
  }
  await page.getByRole('link', { name: 'Pomodoro', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await page.reload();
  expect(canonicalStores(await readStores(page, BACKUP_STORES))).toBe(baseline);
});
