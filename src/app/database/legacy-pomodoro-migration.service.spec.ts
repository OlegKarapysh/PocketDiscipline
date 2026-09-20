import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import type { Table } from 'dexie';
import { LegacyPomodoroMigrationService } from './legacy-pomodoro-migration.service';
import type { PomodoroSession } from '../core/models/pomodoro-session.model';
import { EngagementType } from '../core/models/engagement-type.enum';
import { PomodoroSessionStatus } from '../core/models/pomodoro-session-status.enum';

describe('LegacyPomodoroMigrationService', () => {
  let service: LegacyPomodoroMigrationService;
  let target: { bulkPut: ReturnType<typeof vi.fn> };

  const validSession: PomodoroSession = {
    id: 'session-123',
    durationMinutes: 25,
    engagementType: EngagementType.WORK,
    startTime: 1_700_000_000_000,
    status: PomodoroSessionStatus.COMPLETED,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [LegacyPomodoroMigrationService] });
    service = TestBed.inject(LegacyPomodoroMigrationService);
    target = { bulkPut: vi.fn().mockResolvedValue(undefined) };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const asTarget = () => target as unknown as Table<PomodoroSession, string>;

  const stageLegacyDb = (rows: unknown[], tableName = 'sessions') => {
    vi.spyOn(Dexie, 'exists').mockResolvedValue(true);
    vi.spyOn(Dexie, 'delete').mockResolvedValue(undefined);
    vi.spyOn(Dexie.prototype, 'open').mockResolvedValue(undefined);
    vi.spyOn(Dexie.prototype, 'close').mockImplementation(() => undefined);
    vi.spyOn(Dexie.prototype, 'tables', 'get').mockReturnValue([{ name: tableName }] as never);
    vi.spyOn(Dexie.prototype, 'table').mockReturnValue({
      toArray: vi.fn().mockResolvedValue(rows),
    });
  };

  it('should skip migration when legacy database does not exist', async () => {
    vi.spyOn(Dexie, 'exists').mockResolvedValue(false);
    const deleteSpy = vi.spyOn(Dexie, 'delete');

    await service.migrate(asTarget());

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(target.bulkPut).not.toHaveBeenCalled();
  });

  it('should copy valid sessions into the target table and drop the legacy database', async () => {
    stageLegacyDb([validSession]);

    await service.migrate(asTarget());

    expect(target.bulkPut).toHaveBeenCalledWith([validSession]);
    expect(Dexie.delete).toHaveBeenCalledWith('PomodoroDatabase');
  });

  it('should filter out rows that are not valid PomodoroSessions', async () => {
    stageLegacyDb([
      validSession,
      null,
      {},
      { id: '', durationMinutes: 25, startTime: 1000, status: 'active' },
      { id: 's-1', durationMinutes: '25', startTime: 1000, status: 'active' },
      { id: 's-2', durationMinutes: 25, startTime: '1000', status: 'active' },
      { id: 's-3', durationMinutes: Number.NaN, startTime: 1000, status: 'active' },
      { id: 's-4', durationMinutes: 25, startTime: 1000, status: 42 },
    ]);

    await service.migrate(asTarget());

    expect(target.bulkPut).toHaveBeenCalledWith([validSession]);
  });

  it('should not write anything when no row survives validation, but still drop the legacy database', async () => {
    stageLegacyDb([null, {}, { id: 's-1' }]);

    await service.migrate(asTarget());

    expect(target.bulkPut).not.toHaveBeenCalled();
    expect(Dexie.delete).toHaveBeenCalledWith('PomodoroDatabase');
  });

  it('should leave the target untouched when the legacy database has no sessions table', async () => {
    stageLegacyDb([validSession], 'somethingElse');

    await service.migrate(asTarget());

    expect(target.bulkPut).not.toHaveBeenCalled();
    expect(Dexie.delete).toHaveBeenCalledWith('PomodoroDatabase');
  });

  it('should catch error and log error when migration fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(Dexie, 'exists').mockRejectedValue(new Error('IndexedDB failure'));

    await service.migrate(asTarget());

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to migrate legacy Pomodoro database:',
      expect.any(Error)
    );
  });
});
