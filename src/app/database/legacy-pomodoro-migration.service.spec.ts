import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import type { Table } from 'dexie';
import { LegacyPomodoroMigrationService } from './legacy-pomodoro-migration.service';
import { openEmptyDb } from '../shared/testing/empty-db';
import type { PomodoroSession } from '../core/models/pomodoro-session.model';
import { EngagementType } from '../core/models/engagement-type.enum';
import { PomodoroSessionStatus } from '../core/models/pomodoro-session-status.enum';

const LEGACY_DB_NAME = 'PomodoroDatabase';

describe('LegacyPomodoroMigrationService', () => {
  let service: LegacyPomodoroMigrationService;
  let target: Table<PomodoroSession, string>;

  const validSession: PomodoroSession = {
    id: 'session-123',
    durationMinutes: 25,
    engagementType: EngagementType.WORK,
    startTime: 1_700_000_000_000,
    status: PomodoroSessionStatus.COMPLETED,
  };

  // The main database is opened first: opening it runs this migration on `ready`, and the test
  // means to run it itself.
  beforeEach(async () => {
    target = (await openEmptyDb()).pomodoroSessions;
    service = TestBed.inject(LegacyPomodoroMigrationService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // An outbound auto-incremented key, so the legacy table can hold rows of any shape, even null.
  const stageLegacyDb = async (rows: unknown[], tableName = 'sessions') => {
    const legacyDb = new Dexie(LEGACY_DB_NAME);
    legacyDb.version(1).stores({ [tableName]: '++' });
    await legacyDb.table(tableName).bulkAdd(rows);
    legacyDb.close();
  };

  const sessionsById = async () => new Map((await target.toArray()).map((session) => [session.id, session]));

  it('should skip migration when legacy database does not exist', async () => {
    const deleteSpy = vi.spyOn(Dexie, 'delete');

    await service.migrate(target);

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(await target.count()).toBe(0);
  });

  it('should copy valid sessions into the target table and drop the legacy database', async () => {
    await stageLegacyDb([validSession]);

    await service.migrate(target);

    expect(await target.toArray()).toEqual([validSession]);
    expect(await Dexie.exists(LEGACY_DB_NAME)).toBe(false);
  });

  it('should keep a whole legacy reward and round a fractional one to whole hryvnias', async () => {
    await stageLegacyDb([
      { ...validSession, id: 'whole', rewardEarned: 12 },
      { ...validSession, id: 'fraction', rewardEarned: 12.5 },
    ]);

    await service.migrate(target);

    const sessions = await sessionsById();
    expect(sessions.get('whole')).toEqual({ ...validSession, id: 'whole', rewardEarned: 12 });
    expect(sessions.get('fraction')).toEqual({ ...validSession, id: 'fraction', rewardEarned: 13 });
  });

  it('should filter out rows that are not valid PomodoroSessions', async () => {
    await stageLegacyDb([
      validSession,
      null,
      {},
      { id: '', durationMinutes: 25, startTime: 1000, status: 'active' },
      { id: 's-1', durationMinutes: '25', startTime: 1000, status: 'active' },
      { id: 's-2', durationMinutes: 25, startTime: '1000', status: 'active' },
      { id: 's-3', durationMinutes: Number.NaN, startTime: 1000, status: 'active' },
      { id: 's-4', durationMinutes: 25, startTime: 1000, status: 42 },
    ]);

    await service.migrate(target);

    expect(await target.toArray()).toEqual([validSession]);
  });

  it('should not write anything when no row survives validation, but still drop the legacy database', async () => {
    await stageLegacyDb([null, {}, { id: 's-1' }]);

    await service.migrate(target);

    expect(await target.count()).toBe(0);
    expect(await Dexie.exists(LEGACY_DB_NAME)).toBe(false);
  });

  it('should leave the target untouched when the legacy database has no sessions table', async () => {
    await stageLegacyDb([validSession], 'somethingElse');

    await service.migrate(target);

    expect(await target.count()).toBe(0);
    expect(await Dexie.exists(LEGACY_DB_NAME)).toBe(false);
  });

  it('should catch error and log error when migration fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(Dexie, 'exists').mockRejectedValue(new Error('IndexedDB failure'));

    await service.migrate(target);

    expect(consoleSpy).toHaveBeenCalledWith('Failed to migrate legacy Pomodoro database:', expect.any(Error));
  });
});
