import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest';
import { DbService } from './db.service';
import { LegacyPomodoroMigrationService } from './legacy-pomodoro-migration.service';
import { CURRENT_USER_ID, CURRENT_USER_NAME, DEFAULT_INITIAL_BALANCE } from '../core/models/user.model';
import type { User } from '../core/models/user.model';
import type { Goal } from '../core/models/goal.model';
import { getInitialGoals } from '../core/constants/initial-goals.const';
import { INITIAL_REWARD_CATEGORIES } from '../core/constants/initial-reward-categories.const';

describe('DbService', () => {
  let service: DbService;
  let migrationMock: { migrate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    migrationMock = { migrate: vi.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      providers: [DbService, { provide: LegacyPomodoroMigrationService, useValue: migrationMock }],
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

  it('should declare the schema up to version 9', () => {
    expect(service.verno).toBe(9);
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
        }),
      );
    });

    it('should not re-seed the user when one already exists', async () => {
      vi.spyOn(service.users, 'get').mockResolvedValue(existingUser);
      const addSpy = vi.spyOn(service.users, 'add');

      await service.on.ready.fire(service);

      expect(addSpy).not.toHaveBeenCalled();
    });
  });

  describe('purgeDatabase', () => {
    beforeEach(() => {
      vi.spyOn(service, 'transaction').mockImplementation(((...args: unknown[]) =>
        (args[args.length - 1] as () => Promise<unknown>)()) as never);
    });

    it('should clear every table', async () => {
      const clearSpies = service.tables.map((table) => vi.spyOn(table, 'clear').mockResolvedValue(undefined));
      vi.spyOn(service.users, 'add').mockResolvedValue(CURRENT_USER_ID);
      vi.spyOn(service.goals, 'bulkAdd').mockResolvedValue('');
      vi.spyOn(service.rewardCategories, 'bulkAdd').mockResolvedValue('');

      await service.purgeDatabase();

      expect(clearSpies.length).toBeGreaterThan(0);
      clearSpies.forEach((spy) => {
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });

    it('should seed the user, goals with rewards in whole hryvnias and reward categories a fresh install gets', async () => {
      service.tables.forEach((table) => vi.spyOn(table, 'clear').mockResolvedValue(undefined));
      const addUser = vi.spyOn(service.users, 'add').mockResolvedValue(CURRENT_USER_ID);
      const addGoals = vi.spyOn(service.goals, 'bulkAdd').mockResolvedValue('');
      const addCategories = vi.spyOn(service.rewardCategories, 'bulkAdd').mockResolvedValue('');

      await service.purgeDatabase();

      expect(addUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: CURRENT_USER_ID, balance: DEFAULT_INITIAL_BALANCE }),
      );
      const seededGoals = addGoals.mock.calls[0][0] as Goal[];
      expect(seededGoals.map((goal) => goal.title)).toEqual(getInitialGoals().map((goal) => goal.title));
      expect(seededGoals.map((goal) => goal.rewardValue)).toEqual([2000, 1500, 1500]);
      expect(addCategories).toHaveBeenCalledWith([...INITIAL_REWARD_CATEGORIES]);
    });

    it('should clear and seed inside one transaction so a failure keeps the existing data', async () => {
      const transactionSpy = vi.spyOn(service, 'transaction').mockRejectedValue(new Error('aborted'));
      const clearSpy = vi.spyOn(service.users, 'clear');

      await expect(service.purgeDatabase()).rejects.toThrow('aborted');

      expect(transactionSpy).toHaveBeenCalledWith('rw', service.tables, expect.any(Function));
      expect(clearSpy).not.toHaveBeenCalled();
    });
  });
});
