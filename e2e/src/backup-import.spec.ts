import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { BACKUP_STORES, canonicalStores, importFile } from './backup-import.fixture';
import { readStores, putRows } from './indexed-db';
import type { Rows } from './indexed-db';
import { backupFixture, largeBackupFixture } from '../../src/app/features/backup/testing/backup.fixture';
import type { BackupEnvelope } from '../../src/app/features/backup/models/backup-envelope.model';

test('real export → purge → reviewed replacement preserves every row @smoke', async ({ page }) => {
  await page.goto('settings');
  await expect(page.locator('.last-backup')).toBeVisible();
  const incoming = backupFixture();
  await putRows(page, incoming.data as Rows);
  await page.reload();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloading;
  const path = await download.path();
  const envelope = JSON.parse(readFileSync(path!, 'utf8')) as BackupEnvelope;
  await page.getByRole('button', { name: 'Purge database', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Purge', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await putRows(page, {
    tasks: [
      {
        id: 'destination-only',
        title: 'Remove me',
        type: 'ONEOFF',
        rewardValue: 10,
        isCompleted: false,
        lastCompletedAt: null,
        createdAt: 1,
      },
    ],
  });
  await page.goto('settings');
  await expect(page.locator('.last-backup')).toBeVisible();
  await page.getByRole('link', { name: 'Import data', exact: true }).click();
  await page.locator('app-data-import-page input[type="file"]').setInputFiles(importFile(envelope));
  await expect(page.getByRole('heading', { name: 'Review backup' })).toBeVisible();
  await expect(page.locator('.comparison-row')).toHaveCount(12);
  await page.getByRole('button', { name: 'Replace data', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(
    'All data on this device will be replaced by this backup, including anything changed here since the file was exported.',
  );
  await dialog.getByRole('button', { name: 'Replace data', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  Object.assign(envelope.data['users'][0] as object, { lastExportedAt: Date.parse(envelope.exportedAt) });
  expect(canonicalStores(await readStores(page, BACKUP_STORES))).toBe(canonicalStores(envelope.data as Rows));
});

test('restores on an isolated device while offline and preserves matching imported active session', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('dashboard');
    await expect(page.locator('app-stat-card').first()).toBeVisible();
    await page.getByRole('link', { name: 'Pomodoro', exact: true }).first().click();
    await page.getByRole('button', { name: /Start/ }).first().click();
    await expect.poll(async () => (await readStores(page, ['pomodoroSessions']))['pomodoroSessions'].length).toBe(1);
    const session = (await readStores(page, ['pomodoroSessions']))['pomodoroSessions'][0];
    const input = backupFixture();
    input.data['pomodoroSessions'] = [{ ...session }];
    await page.getByRole('link', { name: 'Settings', exact: true }).first().click();
    await page.getByRole('link', { name: 'Import data', exact: true }).click();
    await context.setOffline(true);
    await page.locator('app-data-import-page input[type="file"]').setInputFiles(importFile(input));
    await page.getByRole('button', { name: 'Replace data', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Replace data', exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    expect((await readStores(page, ['pomodoroSessions']))['pomodoroSessions']).toEqual([session]);
    await page.getByRole('link', { name: 'Pomodoro', exact: true }).first().click();
    await expect(page.getByRole('button', { name: /Start/ }).first()).toBeVisible();
    await context.setOffline(false);
    await page.reload();
    await expect(page.getByRole('button', { name: /Stop/ }).first()).toBeVisible();
  } finally {
    await context.close();
  }
});

test('reviews and restores a valid five-year history in native IndexedDB', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('settings');
  await expect(page.locator('.last-backup')).toBeVisible();
  await page.getByRole('link', { name: 'Import data', exact: true }).click();
  const incoming = largeBackupFixture();
  const file = importFile(incoming);
  const checking = Date.now();
  await page.locator('app-data-import-page input[type="file"]').setInputFiles(file);
  await expect(page.getByRole('heading', { name: 'Review backup' })).toBeVisible();
  const checked = Date.now();
  await page.getByRole('button', { name: 'Replace data', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Replace data', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 90_000 });
  const finished = Date.now();
  const counts = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pocket-discipline-db');
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(new Error('Could not read synthetic history'));
      };
    });
    const names = Array.from(db.objectStoreNames);
    const tx = db.transaction(names, 'readonly');
    const result = Object.fromEntries(
      await Promise.all(
        names.map(
          (name) =>
            new Promise<[string, number]>((resolve, reject) => {
              const request = tx.objectStore(name).count();
              request.onsuccess = () => {
                resolve([name, request.result]);
              };
              request.onerror = () => {
                reject(new Error('Could not count synthetic history'));
              };
            }),
        ),
      ),
    );
    db.close();
    return result;
  });
  expect(counts).toEqual(Object.fromEntries(Object.entries(incoming.data).map(([name, rows]) => [name, rows.length])));
  console.info(
    'Synthetic five-year browser history:',
    file.buffer.length,
    'bytes; review',
    checked - checking,
    'ms; confirm and restore',
    finished - checked,
    'ms on this desktop.',
  );
});
