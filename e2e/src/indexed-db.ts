import type { Page } from '@playwright/test';
import { CURRENT_USER_ID, CURRENT_USER_NAME } from '../../src/app/core/models/user.model';

// Raw IndexedDB access for the money-flow specs: the unit specs mock Dexie, so only a browser can
// show that a balance really moved. Every helper opens the database without asking for a version, so
// the app's own connection is not disturbed. The app must have opened its database first.

const DATABASE = 'pocket-discipline-db';

export type Row = Record<string, unknown>;
export type Rows = Record<string, Row[]>;

export function readStores(page: Page, storeNames: string[]): Promise<Rows> {
  return page.evaluate(
    async ({ database, names }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(database);
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(new Error('could not open the database'));
        };
      });
      const tx = db.transaction(names, 'readonly');
      const entries = await Promise.all(
        names.map(
          (name) =>
            new Promise<[string, Row[]]>((resolve, reject) => {
              const request = tx.objectStore(name).getAll();
              request.onsuccess = () => {
                resolve([name, request.result as Row[]]);
              };
              request.onerror = () => {
                reject(new Error(`could not read ${name}`));
              };
            }),
        ),
      );
      db.close();
      return Object.fromEntries(entries);
    },
    { database: DATABASE, names: storeNames },
  );
}

// Writes the rows in one transaction. Dexie does not see writes made behind its back, so the app
// reads them on its next load.
export async function putRows(page: Page, rows: Rows): Promise<void> {
  await page.evaluate(
    async ({ database, written }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(database);
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(new Error('could not open the database'));
        };
      });
      const tx = db.transaction(Object.keys(written), 'readwrite');
      for (const [store, storeRows] of Object.entries(written)) {
        for (const row of storeRows) tx.objectStore(store).put(row);
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => {
          resolve();
        };
        tx.onerror = () => {
          reject(new Error('could not write the database'));
        };
      });
      db.close();
    },
    { database: DATABASE, written: rows },
  );
}

/** The stored balance, in whole hryvnias. */
export async function readBalance(page: Page): Promise<number> {
  const { users } = await readStores(page, ['users']);
  const user = users.find((row) => row['id'] === CURRENT_USER_ID);
  if (typeof user?.['balance'] !== 'number') throw new Error('no balance stored');
  return user['balance'];
}

export function userRow(balance: number): Row {
  return { id: CURRENT_USER_ID, name: CURRENT_USER_NAME, balance, createdAt: 1, updatedAt: 1 };
}
