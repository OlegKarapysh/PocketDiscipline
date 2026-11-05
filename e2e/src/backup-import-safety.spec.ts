import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { BACKUP_STORES, canonicalStores, importFile } from './backup-import.fixture';
import { readStores } from './indexed-db';
import type { Rows } from './indexed-db';
import type { BackupEnvelope } from '../../src/app/features/backup/models/backup-envelope.model';

test('downloads safety A, restores B, then restores A with all rows intact', async ({ page }) => {
  await page.goto('settings');
  await expect(page.locator('.last-backup')).toBeVisible();
  await page.getByRole('link', { name: 'Import data', exact: true }).click();
  await page.locator('app-data-import-page input[type="file"]').setInputFiles(importFile());
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const downloaded = await downloading;
  const path = await downloaded.path();
  const safety = JSON.parse(readFileSync(path!, 'utf8')) as BackupEnvelope;
  await expect(page.getByRole('heading', { name: 'Review backup' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replace data', exact: true })).toBeEnabled();
  for (const incoming of [undefined, safety]) {
    if (incoming) {
      await page.goto('settings');
      await expect(page.locator('.last-backup')).toBeVisible();
      await page.getByRole('link', { name: 'Import data', exact: true }).click();
      await page.locator('app-data-import-page input[type="file"]').setInputFiles(importFile(incoming));
    }
    await page.getByRole('button', { name: 'Replace data', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Replace data', exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
  }
  Object.assign(safety.data['users'][0] as object, { lastExportedAt: Date.parse(safety.exportedAt) });
  expect(canonicalStores(await readStores(page, BACKUP_STORES))).toBe(canonicalStores(safety.data as Rows));
});

test('cancelled native safety share retains selection and never restores automatically', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', {
      value: () => Promise.reject(new DOMException('Cancelled', 'AbortError')),
      configurable: true,
    });
  });
  await page.goto('settings');
  await expect(page.locator('.last-backup')).toBeVisible();
  await page.getByRole('link', { name: 'Import data', exact: true }).click();
  const before = canonicalStores(await readStores(page, BACKUP_STORES));
  await page.locator('app-data-import-page input[type="file"]').setInputFiles(importFile());
  await page.getByRole('button', { name: 'Export current data', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Replace data', exact: true })).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Review backup' })).toBeVisible();
  expect(canonicalStores(await readStores(page, BACKUP_STORES))).toBe(before);
});

for (const outcome of ['NotAllowedError', 'Error'])
  test(`safety share ${outcome} permits Download and retains review`, async ({ page }) => {
    await page.addInitScript((error) => {
      Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
      Object.defineProperty(navigator, 'share', {
        value: () => Promise.reject(new DOMException('Synthetic failure', error)),
        configurable: true,
      });
    }, outcome);
    await page.goto('settings');
    await expect(page.locator('.last-backup')).toBeVisible();
    await page.getByRole('link', { name: 'Import data', exact: true }).click();
    await page.locator('app-data-import-page input[type="file"]').setInputFiles(importFile());
    await page.getByRole('button', { name: 'Export current data', exact: true }).click();
    await expect(
      page.getByRole('button', { name: outcome === 'NotAllowedError' ? 'Share' : 'Export current data', exact: true }),
    ).toBeVisible();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download', exact: true }).click();
    await downloading;
    await expect(page.getByRole('heading', { name: 'Review backup' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Replace data', exact: true })).toBeEnabled();
    await expect(page).toHaveURL(/settings\/data-import/);
  });
