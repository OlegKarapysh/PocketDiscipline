import { test, expect } from '@playwright/test';
import { BACKUP_STORES, canonicalStores, importFile } from './backup-import.fixture';
import { readStores, putRows } from './indexed-db';

test('same-count title edit from another tab requires renewed consent', async ({ page, context }) => {
  await page.goto('settings');
  await expect(page.locator('.last-backup')).toBeVisible();
  await page.getByRole('link', { name: 'Import data', exact: true }).click();
  const baseline = await readStores(page, BACKUP_STORES);
  await page.locator('app-data-import-page input[type="file"]').setInputFiles(importFile());
  await page.getByRole('button', { name: 'Replace data', exact: true }).click();
  const other = await context.newPage();
  await other.goto('settings');
  await putRows(other, { goals: [{ ...baseline['goals'][0], title: 'Changed in another tab' }] });
  const changed = canonicalStores(await readStores(page, BACKUP_STORES));
  await page.getByRole('dialog').getByRole('button', { name: 'Replace data', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Data on this device changed');
  expect(canonicalStores(await readStores(page, BACKUP_STORES))).toBe(changed);
  await expect(page.getByRole('button', { name: 'Replace data', exact: true })).toBeEnabled();
  await other.close();
});

test('drains a queued timer completion before replacement and requires fresh consent', async ({ page }) => {
  await page.clock.install();
  await page.goto('dashboard');
  await expect(page.locator('app-stat-card').first()).toBeVisible();
  await page.getByRole('link', { name: 'Pomodoro', exact: true }).first().click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Settings', exact: true }).first().click();
  await page.getByRole('link', { name: 'Import data', exact: true }).click();
  await page.locator('app-data-import-page input[type="file"]').setInputFiles(importFile());
  await page.getByRole('button', { name: 'Replace data', exact: true }).click();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pocket-discipline-db');
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(new Error('Could not open synthetic timer blocker'));
      };
    });
    const tx = db.transaction(['pomodoroSessions', 'users'], 'readwrite');
    let active = true;
    Object.assign(window, {
      releaseTimerBlock: () => {
        active = false;
      },
    });
    await new Promise<void>((resolve) => {
      const pump = () => {
        const request = tx.objectStore('pomodoroSessions').get('__test_lock__');
        request.onsuccess = () => {
          resolve();
          if (active) pump();
        };
      };
      pump();
    });
    tx.oncomplete = () => {
      db.close();
    };
  });
  try {
    await page.clock.fastForward(25 * 60 * 1000);
    await page.getByRole('dialog').getByRole('button', { name: 'Replace data', exact: true }).click();
    await expect(page.getByText('Replacing data…', { exact: true })).toBeVisible();
  } finally {
    await page.evaluate(() => (window as unknown as { releaseTimerBlock: () => void }).releaseTimerBlock());
  }
  await expect(page.getByRole('alert')).toContainText('Data on this device changed');
  await page.getByRole('button', { name: 'Nice', exact: true }).click();
  await page.getByRole('button', { name: 'Replace data', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Replace data', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  const committed = canonicalStores(await readStores(page, BACKUP_STORES));
  await page.clock.fastForward(60_000);
  expect(canonicalStores(await readStores(page, BACKUP_STORES))).toBe(committed);
});
