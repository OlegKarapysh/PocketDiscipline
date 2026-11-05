import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import { MAX_BACKUP_BYTES } from '../constants/backup-import.const';
import { backupFixture, largeBackupFixture } from '../testing/backup.fixture';
import { BackupValidationService } from './backup-validation.service';
import { BACKUP_FIELDS } from '../validation/backup-schema.const';

describe('BackupValidationService', () => {
  let service: BackupValidationService;
  let db: DbService;
  const file = (value: unknown) => ({ size: 10, text: () => Promise.resolve(JSON.stringify(value)) }) as File;
  beforeEach(async () => {
    db = await openEmptyDb();
    service = TestBed.inject(BackupValidationService);
  });

  it('accepts all stored fields and permitted historical missing parents without writes', async () => {
    const input = backupFixture();
    expect(await service.validate(file(input), db.verno)).toEqual(input);
    expect(await Promise.all(db.tables.map((table) => table.count()))).toEqual(db.tables.map(() => 0));
  });

  it('bounds bytes before reading and permits exactly the limit', async () => {
    const read = vi.fn(() => Promise.resolve(JSON.stringify(backupFixture())));
    await expect(
      service.validate({ size: MAX_BACKUP_BYTES + 1, text: read } as unknown as File, 11),
    ).rejects.toMatchObject({ code: 'too-large' });
    expect(read).not.toHaveBeenCalled();
    await expect(
      service.validate({ size: MAX_BACKUP_BYTES, text: read } as unknown as File, 11),
    ).resolves.toBeDefined();
  });

  it.each([
    ['format', 'other', 'invalid-header'],
    ['formatVersion', '1', 'invalid-header'],
    ['schemaVersion', 0, 'invalid-header'],
    ['encrypted', 'false', 'invalid-header'],
    ['exportedAt', '2026-02-30T00:00:00.000Z', 'invalid-header'],
    ['appVersion', '01.0.0', 'invalid-header'],
    ['appVersion', '0.0.0-01', 'invalid-header'],
    ['appVersion', '0.0.1', 'update-required'],
    ['formatVersion', 2, 'update-required'],
    ['schemaVersion', 12, 'update-required'],
  ])('rejects invalid header %s=%s', async (key, value, code) => {
    await expect(service.validate(file({ ...backupFixture(), [key]: value }), 11)).rejects.toMatchObject({ code });
  });

  it('compares numeric/prerelease SemVer precedence and ignores build metadata', async () => {
    for (const appVersion of ['0.0.0-alpha.2', '0.0.0-alpha.10', '0.0.0+build.10']) {
      await expect(service.validate(file({ ...backupFixture(), appVersion }), 11)).resolves.toBeDefined();
    }
    for (const appVersion of ['0.0.10', '0.10.0', '10.0.0', '1.0.0-beta.2']) {
      await expect(service.validate(file({ ...backupFixture(), appVersion }), 11)).rejects.toMatchObject({
        code: 'update-required',
      });
    }
  });

  it('refuses an encrypted header before requiring data, after newer-version refusal', async () => {
    const { data: _data, ...header } = backupFixture();
    await expect(service.validate(file({ ...header, encrypted: true }), 11)).rejects.toMatchObject({
      code: 'encryption-unsupported',
    });
    await expect(service.validate(file({ ...header, encrypted: true, schemaVersion: 12 }), 11)).rejects.toMatchObject({
      code: 'update-required',
    });
  });

  it('reports unreadable files and malformed JSON safely', async () => {
    await expect(service.validate({ size: 1, text: () => Promise.resolve('{') } as File, 11)).rejects.toMatchObject({
      code: 'invalid-json',
    });
    await expect(
      service.validate(
        {
          size: 1,
          text: () => Promise.reject(new Error('private data')),
        } as unknown as File,
        11,
      ),
    ).rejects.toMatchObject({ code: 'file-read' });
  });

  it.each(Object.keys(backupFixture().data))('rejects unknown fields and duplicates in %s', async (table) => {
    const input = backupFixture();
    input.data[table] = input.data[table].map((row) => ({ ...(row as object), unexpected: true }));
    await expect(service.validate(file(input), 11)).rejects.toMatchObject({ code: 'invalid-row' });
    const duplicate = backupFixture();
    duplicate.data[table].push(duplicate.data[table][0]);
    await expect(service.validate(file(duplicate), 11)).rejects.toMatchObject({ code: 'duplicate-key' });
  });

  it.each(
    Object.entries(BACKUP_FIELDS).flatMap(([table, fields]) => Object.keys(fields).map((field) => [table, field])),
  )('rejects an invalid type in %s.%s without writing', async (table, field) => {
    const input = backupFixture();
    Object.assign(input.data[table][0] as object, { [field]: { invalid: true } });
    await expect(service.validate(file(input), 11)).rejects.toMatchObject({ code: 'invalid-row' });
    expect(await Promise.all(db.tables.map((table) => table.count()))).toEqual(db.tables.map(() => 0));
  });

  it.each([
    ['users', 'balance', 1.5],
    ['tasks', 'rewardValue', -1],
    ['goals', 'rewardValue', Number.MAX_SAFE_INTEGER + 1],
    ['dailyTasks', 'streak', -1],
    ['dailyScores', 'date', '2025-02-29'],
    ['dailyScores', 'score', 11],
    ['pomodoroSessions', 'startTime', 9e15],
    ['pomodoroRewardRates', 'baseReward', 0],
    ['withdrawals', 'amount', null],
    ['rewards', 'updatedAt', null],
    ['rewardCategories', 'isDefault', 1],
  ])('rejects invalid %s.%s', async (table, field, value) => {
    const input = backupFixture();
    Object.assign(input.data[table][0] as object, { [field]: value });
    await expect(service.validate(file(input), 11)).rejects.toMatchObject({ code: 'invalid-row' });
  });

  it.each(['#abc', '#ABCDEF', '#aBcDeF', ''])('preserves allowed color %s', async (color) => {
    const input = backupFixture();
    Object.assign(input.data['rewardCategories'][0] as object, { color });
    expect(await service.validate(file(input), 11)).toEqual(input);
  });
  it.each(['red', 'var(--color)', '#abcd', '#fff;display:none', ' #fff'])('rejects color %s', async (color) => {
    const input = backupFixture();
    Object.assign(input.data['rewardCategories'][0] as object, { color });
    await expect(service.validate(file(input), 11)).rejects.toMatchObject({ code: 'invalid-row' });
  });

  it('rejects required references, missing/extra tables and malformed nested rewards', async () => {
    const input = backupFixture();
    input.data['rewardCategories'] = [];
    await expect(service.validate(file(input), 11)).rejects.toMatchObject({ code: 'invalid-reference' });
    const missing = backupFixture();
    delete missing.data['goals'];
    await expect(service.validate(file(missing), 11)).rejects.toMatchObject({ code: 'invalid-row' });
    const extra = backupFixture();
    extra.data['extra'] = [];
    await expect(service.validate(file(extra), 11)).rejects.toMatchObject({ code: 'invalid-row' });
    const nested = backupFixture();
    Object.assign(nested.data['dailyTasks'][0] as object, { difficulties: [{ id: 'x', name: 'x', baseReward: 1.5 }] });
    await expect(service.validate(file(nested), 11)).rejects.toMatchObject({ code: 'invalid-row' });
    Object.assign(nested.data['dailyTasks'][0] as object, {
      difficulties: [
        { id: 'x', name: 'x', baseReward: 0 },
        { id: 'x', name: 'y', baseReward: 1 },
      ],
    });
    await expect(service.validate(file(nested), 11)).rejects.toMatchObject({ code: 'duplicate-key' });
  });

  it('takes the supported schema from the running database rather than a fixed version', async () => {
    const input = { ...backupFixture(), schemaVersion: db.verno + 1 };
    await expect(service.validate(file(input), db.verno)).rejects.toMatchObject({ code: 'update-required' });
    expect(await service.validate(file(input), db.verno + 1)).toEqual(input);
  });

  it('checks a valid five-year history within the file cap', async () => {
    const input = largeBackupFixture();
    const text = JSON.stringify(input);
    const bytes = new TextEncoder().encode(text).length;
    expect(bytes).toBeLessThan(MAX_BACKUP_BYTES);
    const started = performance.now();
    const result = await service.validate({ size: bytes, text: () => Promise.resolve(text) } as File, 11);
    expect(result.data['dailyTaskCompletions']).toHaveLength(36_500);
    expect(result.data['pomodoroSessions']).toHaveLength(21_900);
    console.info(
      `Synthetic five-year validation: ${bytes} bytes, ${Math.round(performance.now() - started)} ms on this desktop.`,
    );
  });
});
