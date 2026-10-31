import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest';
import Dexie from 'dexie';
import { DbService } from './db.service';
import { openEmptyDb } from '../shared/testing/empty-db';
import { CURRENT_USER_ID, CURRENT_USER_NAME, DEFAULT_INITIAL_BALANCE } from '../core/models/user.model';
import type { User } from '../core/models/user.model';
import type { Goal } from '../core/models/goal.model';
import { GOAL_STATUS } from '../core/models/goal.model';
import type { PomodoroSession } from '../core/models/pomodoro-session.model';
import { EngagementType } from '../core/models/engagement-type.enum';
import { PomodoroSessionStatus } from '../core/models/pomodoro-session-status.enum';
import { getInitialGoals } from '../core/constants/initial-goals.const';
import { INITIAL_REWARD_CATEGORIES } from '../core/constants/initial-reward-categories.const';

describe('DbService', () => {
  let service: DbService;

  const existingUser: User = {
    id: CURRENT_USER_ID,
    name: 'Existing',
    balance: 700,
    createdAt: 0,
    updatedAt: 0,
  };

  const session: PomodoroSession = {
    id: 'session-1',
    durationMinutes: 25,
    engagementType: EngagementType.WORK,
    startTime: 1_700_000_000_000,
    status: PomodoroSessionStatus.COMPLETED,
  };

  const goal = (id: string, rewardValue: number): Goal => ({
    id,
    title: id,
    rewardValue,
    status: GOAL_STATUS.ACTIVE,
    completedAt: null,
    createdAt: 0,
  });

  // A database left at version 8 by an older release, for this one to open.
  const stageVersion8 = async (seed: (db: Dexie) => Promise<unknown>) => {
    const db = new Dexie('pocket-discipline-db');
    db.version(8).stores({
      users: 'id',
      tasks: 'id, type, isCompleted',
      goals: 'id, status, completedAt',
      dailyTasks: 'id',
      dailyScores: 'date',
      pomodoroSessions: 'id, startTime, status',
      dailyTaskCompletions: 'id, date, taskId',
      withdrawals: 'id, date, categoryId, timestamp, rewardId',
      rewards: 'id, categoryId, type, status, createdAt',
      rewardCategories: 'id, name, isProtected',
    });
    await db.open();
    await seed(db);
    db.close();
  };

  beforeEach(() => {
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
    expect(service.pomodoroRewardRates).toBeDefined();
  });

  it('should declare the schema up to version 11', () => {
    expect(service.verno).toBe(11);
  });

  describe('on a fresh install', () => {
    it('should seed the user, the initial goals and the reward categories', async () => {
      await service.open();

      expect(await service.users.get(CURRENT_USER_ID)).toEqual(
        expect.objectContaining({ name: CURRENT_USER_NAME, balance: DEFAULT_INITIAL_BALANCE }),
      );
      expect((await service.goals.toArray()).map((g) => g.title).sort()).toEqual(
        getInitialGoals()
          .map((g) => g.title)
          .sort(),
      );
      expect(await service.rewardCategories.toArray()).toEqual(expect.arrayContaining([...INITIAL_REWARD_CATEGORIES]));
      expect(await service.rewardCategories.count()).toBe(INITIAL_REWARD_CATEGORIES.length);
    });
  });

  describe('on ready', () => {
    it('should move the sessions of the legacy pomodoro database into the pomodoro sessions table', async () => {
      const legacyDb = new Dexie('PomodoroDatabase');
      legacyDb.version(1).stores({ sessions: 'id' });
      await legacyDb.table('sessions').add(session);
      legacyDb.close();

      await service.open();

      expect(await service.pomodoroSessions.get(session.id)).toEqual(session);
      expect(await Dexie.exists('PomodoroDatabase')).toBe(false);
    });

    it('should seed the single user when the table is empty', async () => {
      await stageVersion8(() => Promise.resolve());

      await service.open();

      expect(await service.users.get(CURRENT_USER_ID)).toEqual(
        expect.objectContaining({
          id: CURRENT_USER_ID,
          name: CURRENT_USER_NAME,
          balance: DEFAULT_INITIAL_BALANCE,
        }),
      );
    });

    it('should not re-seed the user when one already exists', async () => {
      await stageVersion8((db) => db.table('users').add(existingUser));

      await service.open();

      expect(await service.users.toArray()).toEqual([existingUser]);
    });
  });

  describe('upgrading from version 8', () => {
    it('should round every stored money value to whole hryvnias', async () => {
      await stageVersion8((db) =>
        Promise.all([
          db.table('users').add({ ...existingUser, balance: 0.09999999999999432 }),
          db.table('goals').bulkAdd([goal('half-up', 12.5), goal('down', 7.4), goal('negative', -0.4)]),
          db
            .table('withdrawals')
            .add({ id: 'w-1', amount: 99.6, title: 'Dinner', categoryId: 'c', date: '', timestamp: 0 }),
          db.table('pomodoroSessions').bulkAdd([
            { ...session, id: 'rewarded', rewardEarned: 12.5 },
            { ...session, id: 'unrewarded' },
          ]),
          db.table('dailyTasks').add({
            id: 'task',
            title: 'Run',
            createdAt: 0,
            difficulties: [{ id: 'easy', name: 'Easy', baseReward: 2.5 }],
            streak: 0,
            lastCompletedAt: null,
          }),
        ]),
      );

      await service.open();

      expect((await service.users.get(CURRENT_USER_ID))?.balance).toBe(0);
      const rewards = new Map((await service.goals.toArray()).map((g) => [g.id, g.rewardValue]));
      expect(rewards).toEqual(
        new Map([
          ['half-up', 13],
          ['down', 7],
          ['negative', 0],
        ]),
      );
      expect(Object.is(rewards.get('negative'), -0)).toBe(false);
      expect((await service.withdrawals.get('w-1'))?.amount).toBe(100);
      expect((await service.pomodoroSessions.get('rewarded'))?.rewardEarned).toBe(13);
      expect(await service.pomodoroSessions.get('unrewarded')).toEqual({ ...session, id: 'unrewarded' });
      expect((await service.dailyTasks.get('task'))?.difficulties[0].baseReward).toBe(3);
    });

    it('should number the daily tasks in the order the list used to show them', async () => {
      await stageVersion8((db) =>
        db.table('dailyTasks').bulkAdd(
          ['b', 'c', 'a'].map((id) => ({
            id,
            title: id,
            createdAt: 0,
            difficulties: [],
            streak: 0,
            lastCompletedAt: null,
          })),
        ),
      );

      await service.open();

      const sortOrders = new Map((await service.dailyTasks.toArray()).map((t) => [t.id, t.sortOrder]));
      expect(sortOrders).toEqual(
        new Map([
          ['a', 0],
          ['b', 1],
          ['c', 2],
        ]),
      );
    });

    it('should keep the existing data and seed nothing a fresh install gets', async () => {
      await stageVersion8((db) =>
        Promise.all([db.table('users').add(existingUser), db.table('goals').add(goal('mine', 10))]),
      );

      await service.open();

      expect(await service.users.toArray()).toEqual([existingUser]);
      expect((await service.goals.toArray()).map((g) => g.id)).toEqual(['mine']);
      expect(await service.rewardCategories.count()).toBe(0);
    });

    it('should add the pomodoro reward rates table', async () => {
      await stageVersion8(() => Promise.resolve());

      await service.open();

      expect(await service.pomodoroRewardRates.count()).toBe(0);
    });
  });

  describe('purgeDatabase', () => {
    beforeEach(async () => {
      await openEmptyDb();
      await Promise.all([
        service.users.add({ ...existingUser, balanceSetUpAt: 1 }),
        service.goals.add(goal('mine', 10)),
        service.pomodoroSessions.add(session),
        service.withdrawals.add({ id: 'w-1', amount: 10, title: 'Coffee', categoryId: 'c', date: '', timestamp: 0 }),
        service.rewardCategories.add({ ...INITIAL_REWARD_CATEGORIES[0], id: 'custom', name: 'Custom' }),
      ]);
    });

    it('should clear every table', async () => {
      await service.purgeDatabase();

      expect(await service.goals.get('mine')).toBeUndefined();
      expect(await service.rewardCategories.get('custom')).toBeUndefined();
      expect(await service.pomodoroSessions.count()).toBe(0);
      expect(await service.withdrawals.count()).toBe(0);
    });

    it('should seed the user, goals with rewards in whole hryvnias and reward categories a fresh install gets', async () => {
      await service.purgeDatabase();

      const users = await service.users.toArray();
      expect(users).toEqual([expect.objectContaining({ id: CURRENT_USER_ID, balance: DEFAULT_INITIAL_BALANCE })]);
      expect(users[0]).not.toHaveProperty('balanceSetUpAt');
      const seededGoals = await service.goals.toArray();
      expect(seededGoals.map((g) => g.title).sort()).toEqual(
        getInitialGoals()
          .map((g) => g.title)
          .sort(),
      );
      expect(seededGoals.map((g) => g.rewardValue).sort()).toEqual([1500, 1500, 2000]);
      expect(await service.rewardCategories.toArray()).toEqual(expect.arrayContaining([...INITIAL_REWARD_CATEGORIES]));
      expect(await service.rewardCategories.count()).toBe(INITIAL_REWARD_CATEGORIES.length);
    });

    it('should clear and seed inside one transaction so a failure keeps the existing data', async () => {
      vi.spyOn(service.rewardCategories, 'bulkAdd').mockRejectedValue(new Error('aborted'));

      await expect(service.purgeDatabase()).rejects.toThrow('aborted');

      expect(await service.users.toArray()).toEqual([{ ...existingUser, balanceSetUpAt: 1 }]);
      expect((await service.goals.toArray()).map((g) => g.id)).toEqual(['mine']);
      expect(await service.pomodoroSessions.toArray()).toEqual([session]);
      expect(await service.withdrawals.count()).toBe(1);
    });
  });
});
