import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest';
import { DbService } from './db.service';
import { LegacyPomodoroMigrationService } from './legacy-pomodoro-migration.service';
import { CURRENT_USER_ID, CURRENT_USER_NAME, DEFAULT_INITIAL_BALANCE } from '../core/models/user.model';
import type { User } from '../core/models/user.model';

describe('DbService', () => {
  let service: DbService;
  let migrationMock: { migrate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    migrationMock = { migrate: vi.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      providers: [
        DbService,
        { provide: LegacyPomodoroMigrationService, useValue: migrationMock },
      ],
    });
    service = TestBed.inject(DbService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should instantiate DbService with all required tables', () => {
    expect(service).toBeDefined();
    expect(service.name).toBe('pocket-discipline-db');
    expect(service.users).toBeDefined();
    expect(service.tasks).toBeDefined();
    expect(service.goals).toBeDefined();
    expect(service.dailyTasks).toBeDefined();
    expect(service.dailyScores).toBeDefined();
    expect(service.pomodoroSessions).toBeDefined();
    expect(service.dailyTaskCompletions).toBeDefined();
    expect(service.withdrawals).toBeDefined();
    expect(service.rewards).toBeDefined();
    expect(service.rewardCategories).toBeDefined();
  });

  it('should declare the schema up to version 8', () => {
    expect(service.verno).toBe(8);
  });

  describe('on ready', () => {
    const existingUser: User = {
      id: CURRENT_USER_ID,
      name: CURRENT_USER_NAME,
      balance: DEFAULT_INITIAL_BALANCE,
      createdAt: 0,
      updatedAt: 0,
    };

    it('should hand the pomodoro sessions table to the legacy migration', async () => {
      vi.spyOn(service.users, 'get').mockResolvedValue(existingUser);

      await service.on.ready.fire(service);

      expect(migrationMock.migrate).toHaveBeenCalledWith(service.pomodoroSessions);
    });

    it('should seed the single user when the table is empty', async () => {
      vi.spyOn(service.users, 'get').mockResolvedValue(undefined);
      const addSpy = vi.spyOn(service.users, 'add').mockResolvedValue(CURRENT_USER_ID);

      await service.on.ready.fire(service);

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: CURRENT_USER_ID,
          name: CURRENT_USER_NAME,
          balance: DEFAULT_INITIAL_BALANCE,
        })
      );
    });

    it('should not re-seed the user when one already exists', async () => {
      vi.spyOn(service.users, 'get').mockResolvedValue(existingUser);
      const addSpy = vi.spyOn(service.users, 'add');

      await service.on.ready.fire(service);

      expect(addSpy).not.toHaveBeenCalled();
    });
  });
});
