import { TestBed } from '@angular/core/testing';
import { DbService } from '../../database/db.service';

/**
 * Opens the test's `DbService` on the in-memory IndexedDB that `src/test-setup.ts` gives every test,
 * then clears what opening seeds (the user row, the initial goals and reward categories), so the
 * test starts from empty tables with the real schema, indexes, transactions and live queries.
 * Seed the rows a test needs through the returned database.
 */
export async function openEmptyDb(): Promise<DbService> {
  const db = TestBed.inject(DbService);
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  return db;
}
