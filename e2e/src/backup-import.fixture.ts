import { backupFixture } from '../../src/app/features/backup/testing/backup.fixture';
import type { Rows } from './indexed-db';

export const BACKUP_STORES = Object.keys(backupFixture().data);

export function importFile(envelope: unknown = backupFixture(), name = 'synthetic-backup.txt') {
  return { name, mimeType: 'text/plain', buffer: Buffer.from(JSON.stringify(envelope)) };
}

export function canonicalStores(rows: Rows): string {
  function ordered(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(ordered);
    if (value !== null && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, item]) => [key, ordered(item)]),
      );
    return value;
  }
  return JSON.stringify(
    ordered(
      Object.fromEntries(
        Object.entries(rows).map(([table, items]) => [
          table,
          [...items].sort((a, b) => {
            const key = table === 'dailyScores' ? 'date' : table === 'pomodoroRewardRates' ? 'engagementType' : 'id';
            return String(a[key]).localeCompare(String(b[key]));
          }),
        ]),
      ),
    ),
  );
}
