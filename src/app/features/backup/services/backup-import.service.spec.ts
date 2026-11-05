import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import { backupFixture } from '../testing/backup.fixture';
import { BACKUP_TABLES } from '../validation/backup-schema.const';
import { BackupImportService } from './backup-import.service';

describe('BackupImportService', () => {
  let db: DbService;
  beforeEach(async () => {
    db = await openEmptyDb();
  });
  it('covers every database table and prepares without writing to the real database', async () => {
    expect(Object.keys(BACKUP_TABLES).sort()).toEqual(db.tables.map((table) => table.name).sort());
    const input = backupFixture();
    const result = await TestBed.inject(BackupImportService).prepare({
      size: 10,
      text: () => Promise.resolve(JSON.stringify(input)),
    } as File);
    expect(result.envelope).toEqual(input);
    expect(result.balance).toBe(-12);
    expect(result.transformed).toBe(false);
    expect(await Promise.all(db.tables.map((table) => table.count()))).toEqual(db.tables.map(() => 0));
  });
  it('prepares older schema seed identities once for review and retry', async () => {
    const input = backupFixture(1);
    const prepared = await TestBed.inject(BackupImportService).prepare({
      size: 10,
      text: () => Promise.resolve(JSON.stringify(input)),
    } as File);
    expect(prepared.transformed).toBe(true);
    expect(prepared.envelope.schemaVersion).toBe(1);
    expect(Object.keys(prepared.envelope.data).sort()).toEqual(db.tables.map((table) => table.name).sort());
  });

  async function seed() {
    const source = backupFixture();
    for (const table of db.tables) await table.bulkAdd(source.data[table.name]);
    return source;
  }
  const file = (value: unknown) => ({ size: 10, text: () => Promise.resolve(JSON.stringify(value)) }) as File;

  it('replaces every store, removes destination rows and overrides only lastExportedAt', async () => {
    const original = await seed();
    const service = TestBed.inject(BackupImportService);
    const baseline = await service.snapshot();
    const incoming = backupFixture();
    incoming.data['tasks'] = [];
    const prepared = await service.prepare(file(incoming));
    await service.replace(prepared, baseline);
    const expected = structuredClone(incoming.data);
    Object.assign(expected['users'][0] as object, { lastExportedAt: Date.parse(incoming.exportedAt) });
    for (const table of db.tables) expect(await table.toArray(), table.name).toEqual(expected[table.name]);
    expect(original.data['tasks'].length).toBe(1);
    expect(prepared.envelope.data).toEqual(incoming.data);
  });

  it('refuses a changed title even when counts and balance are unchanged', async () => {
    await seed();
    const service = TestBed.inject(BackupImportService);
    const baseline = await service.snapshot();
    await db.tasks.update('task', { title: 'Changed elsewhere' });
    const changed = await service.snapshot();
    expect(changed.counts).toEqual(baseline.counts);
    expect(changed.balance).toBe(baseline.balance);
    const prepared = await service.prepare(file(backupFixture()));
    await expect(service.replace(prepared, baseline)).rejects.toMatchObject({ code: 'device-changed' });
    expect((await service.snapshot()).canonical).toBe(changed.canonical);
  });

  it('ignores object property order but preserves meaningful nested array order', async () => {
    await seed();
    const service = TestBed.inject(BackupImportService);
    const task = (await db.dailyTasks.get('daily'))!;
    await db.dailyTasks.put({
      ...task,
      difficulties: [...task.difficulties, { id: 'hard', name: 'Hard', baseReward: 20 }],
    });
    const before = await service.snapshot();
    const profile = (await db.users.get(1))!;
    await db.users.put({
      updatedAt: profile.updatedAt,
      createdAt: profile.createdAt,
      balance: profile.balance,
      name: profile.name,
      id: profile.id,
    });
    expect((await service.snapshot()).canonical).toBe(before.canonical);
    await db.users.put({ ...profile, balanceSetUpAt: undefined });
    expect((await service.snapshot()).canonical).not.toBe(before.canonical);
    await db.users.put(profile);
    await db.dailyTasks.update('daily', {
      difficulties: [{ id: 'hard', name: 'Hard', baseReward: 20 }, ...task.difficulties],
    });
    expect((await service.snapshot()).canonical).not.toBe(before.canonical);
  });

  it('rolls back a real duplicate-key insertion after clearing and permits retry with retained prepared seeds', async () => {
    await seed();
    const service = TestBed.inject(BackupImportService);
    const baseline = await service.snapshot();
    const prepared = await service.prepare(file(backupFixture(1)));
    const retained = structuredClone(prepared);
    let inserted = 0;
    const failInsert = () => {
      if (++inserted === 2) throw new Error('Synthetic write failure');
    };
    db.goals.hook('creating', failInsert);
    try {
      await expect(service.replace(prepared, baseline)).rejects.toMatchObject({ code: 'storage-failed' });
    } finally {
      db.goals.hook('creating').unsubscribe(failInsert);
    }
    expect(inserted).toBeGreaterThanOrEqual(2);
    expect((await service.snapshot()).canonical).toBe(baseline.canonical);
    expect(prepared).toEqual(retained);
    await service.replace(prepared, baseline);
    expect(await db.goals.toArray()).toEqual(expect.arrayContaining(retained.envelope.data['goals']));
    expect(await db.goals.count()).toBe(retained.envelope.data['goals'].length);
  });
});
