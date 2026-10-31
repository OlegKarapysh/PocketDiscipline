import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { GoalService } from './goal.service';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import type { Goal } from '../../../core/models/goal.model';
import { GOAL_STATUS } from '../../../core/models/goal.model';
import { CURRENT_USER_ID } from '../../../core/models/user.model';
import { getInitialGoals } from '../../../core/constants/initial-goals.const';

describe('GoalService', () => {
  let service: GoalService;
  let db: DbService;

  const startingBalance = 10_000;

  const balance = async () => (await db.users.get(CURRENT_USER_ID))?.balance;

  beforeEach(async () => {
    db = await openEmptyDb();
    await db.users.add({ id: CURRENT_USER_ID, name: 'Current', balance: startingBalance, createdAt: 0, updatedAt: 0 });
    service = TestBed.inject(GoalService);
  });

  function storedGoal(state: Pick<Goal, 'status' | 'completedAt'>): Goal {
    return {
      id: 'goal-123',
      title: 'do 50 push-ups on fists',
      rewardValue: 2000,
      createdAt: Date.now(),
      ...state,
    };
  }

  function activeGoal(id: string, title: string, rewardValue: number, createdAt = Date.now()): Goal {
    return { id, title, rewardValue, status: GOAL_STATUS.ACTIVE, completedAt: null, createdAt };
  }

  describe('Live Queries', () => {
    it('should return live query and emit active goals filtered by status', async () => {
      const active = activeGoal('goal-123', 'do 50 push-ups on fists', 2000);
      await db.goals.bulkAdd([
        active,
        { ...storedGoal({ status: GOAL_STATUS.COMPLETED, completedAt: Date.now() }), id: 'goal-456' },
      ]);

      const result = await firstValueFrom(service.getActiveGoals());

      expect(result).toEqual([active]);
    });

    it('should emit active goals newest first, whatever order the store returns them in', async () => {
      // The store returns rows in key order: a, b, c.
      await db.goals.bulkAdd([
        activeGoal('b', 'Middle', 100, 2000),
        activeGoal('c', 'Newest', 100, 3000),
        activeGoal('a', 'Oldest', 100, 1000),
      ]);

      const result = await firstValueFrom(service.getActiveGoals());

      expect(result.map((g) => g.title)).toEqual(['Newest', 'Middle', 'Oldest']);
    });

    it('should list goals created in the same millisecond in the same order on every query', async () => {
      const titles = ['Squats', 'Push-ups', 'Pomodoro'];
      await db.goals.bulkAdd(titles.map((title, i) => activeGoal(`${i}`, title, 100, 1000)));
      const first = await firstValueFrom(service.getActiveGoals());

      // The same goals under keys in the opposite order, so the store returns them reversed.
      await db.goals.clear();
      await db.goals.bulkAdd(titles.map((title, i) => activeGoal(`${titles.length - i}`, title, 100, 1000)));
      const second = await firstValueFrom(service.getActiveGoals());

      expect(second.map((g) => g.title)).toEqual(first.map((g) => g.title));
    });

    it('should list the starter goals of a fresh install in the order they are defined', async () => {
      // A fast machine seeds all of them within one millisecond.
      const clock = vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
      const seeded = getInitialGoals();
      clock.mockRestore();
      // Keys that make the store return them as [third, first, second].
      await db.goals.bulkAdd([
        { ...seeded[2], id: 'a' },
        { ...seeded[0], id: 'b' },
        { ...seeded[1], id: 'c' },
      ]);

      const result = await firstValueFrom(service.getActiveGoals());

      expect(result.map((g) => g.title)).toEqual(seeded.map((g) => g.title));
    });

    it('should return live query and emit completed goals sorted by completedAt', async () => {
      const completed = (id: string, completedAt: number): Goal => ({
        ...storedGoal({ status: GOAL_STATUS.COMPLETED, completedAt }),
        id,
        title: id,
      });
      await db.goals.bulkAdd([
        completed('earlier', 1000),
        completed('latest', 3000),
        completed('middle', 2000),
        activeGoal('active', 'Still active', 100),
      ]);

      const result = await firstValueFrom(service.getCompletedGoals());

      expect(result.map((g) => g.id)).toEqual(['latest', 'middle', 'earlier']);
    });
  });

  describe('addGoal', () => {
    it('should add a new active goal when title is unique', async () => {
      await service.addGoal('do 50 push-ups on fists', 2000);

      expect(await db.goals.toArray()).toEqual([
        expect.objectContaining({
          title: 'do 50 push-ups on fists',
          rewardValue: 2000,
          status: GOAL_STATUS.ACTIVE,
          completedAt: null,
        }),
      ]);
    });

    it('should throw error when adding a goal with duplicate title (case-insensitive)', async () => {
      await db.goals.add(activeGoal('existing-1', 'do 50 push-ups on fists'.toUpperCase(), 1000));

      await expect(service.addGoal('do 50 push-ups on fists'.toLowerCase(), 2000)).rejects.toThrow(
        'A goal with this title already exists.',
      );
      expect(await db.goals.count()).toBe(1);
    });

    it('should store the title trimmed', async () => {
      await service.addGoal('  Read a book  ', 100);

      expect(await db.goals.toArray()).toEqual([expect.objectContaining({ title: 'Read a book' })]);
    });

    it('should treat a title that only differs by surrounding spaces as a duplicate', async () => {
      await db.goals.add(activeGoal('existing-1', 'Read a book', 100));

      await expect(service.addGoal('read a book ', 100)).rejects.toThrow('A goal with this title already exists.');
      expect(await db.goals.count()).toBe(1);
    });

    it('should refuse a reward that is not a whole number of hryvnias, at least 1', async () => {
      for (const rewardValue of [12.5, 0, -100, NaN]) {
        await expect(service.addGoal('Read a book', rewardValue)).rejects.toThrow(
          'Goal reward must be a whole number of hryvnias, at least 1.',
        );
      }
      expect(await db.goals.count()).toBe(0);
    });

    it('should store only one of two goals added at the same time with the same title', async () => {
      const results = await Promise.allSettled([service.addGoal('Run 5 km', 300), service.addGoal('run 5 km ', 400)]);

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(await db.goals.count()).toBe(1);
    });
  });

  describe('updateGoal', () => {
    it('should update title and reward for an active goal', async () => {
      const goal = activeGoal('goal-123', 'do 50 push-ups on fists', 2000);
      await db.goals.add(goal);

      await service.updateGoal('goal-123', 'do 100 push-ups', 2500);

      expect(await db.goals.get('goal-123')).toEqual({ ...goal, title: 'do 100 push-ups', rewardValue: 2500 });
    });

    it('should throw error when updating goal title to an existing another active goal title', async () => {
      const currentGoal = activeGoal('goal-123', 'do 50 push-ups on fists', 2000);
      await db.goals.bulkAdd([currentGoal, activeGoal('other-id', 'do 100 push-ups', 500)]);

      await expect(service.updateGoal('goal-123', 'do 100 push-ups', 2500)).rejects.toThrow(
        'A goal with this title already exists.',
      );
      expect(await db.goals.get('goal-123')).toEqual(currentGoal);
    });

    it('should do nothing if goal is not found or not active', async () => {
      const completed = storedGoal({ status: GOAL_STATUS.COMPLETED, completedAt: Date.now() });
      await db.goals.add(completed);

      await service.updateGoal('goal-123', 'do 100 push-ups', 2500);
      await service.updateGoal('missing', 'do 100 push-ups', 2500);

      expect(await db.goals.toArray()).toEqual([completed]);
    });

    it('should refuse a reward that is not a whole number of hryvnias', async () => {
      const goal = activeGoal('goal-123', 'do 50 push-ups on fists', 2000);
      await db.goals.add(goal);

      await expect(service.updateGoal('goal-123', 'do 100 push-ups', 2500.5)).rejects.toThrow(
        'Goal reward must be a whole number of hryvnias, at least 1.',
      );
      expect(await db.goals.get('goal-123')).toEqual(goal);
    });

    it('should let only one of two goals renamed at the same time take the same title', async () => {
      await db.goals.bulkAdd([activeGoal('a', 'Squats', 100), activeGoal('b', 'Push-ups', 200)]);

      const results = await Promise.allSettled([
        service.updateGoal('a', 'Morning workout', 100),
        service.updateGoal('b', 'morning workout', 200),
      ]);

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      const goals = await db.goals.toArray();
      expect(goals.filter((goal) => goal.title.toLowerCase() === 'morning workout')).toHaveLength(1);
    });

    it('should credit and later debit the reward the completed goal keeps when an edit races its completion', async () => {
      await db.goals.add(activeGoal('goal-123', 'Squats', 1500));

      await Promise.all([service.updateGoal('goal-123', 'More squats', 6500), service.completeGoal('goal-123')]);
      const kept = (await db.goals.get('goal-123'))?.rewardValue;
      expect(await balance()).toBe(startingBalance + (kept ?? Number.NaN));

      await service.undoCompleteGoal('goal-123');
      expect(await balance()).toBe(startingBalance);
    });
  });

  describe('completeGoal and undoCompleteGoal', () => {
    it('should complete an active goal, set timestamp, and add reward to user balance', async () => {
      await db.goals.add(storedGoal({ status: GOAL_STATUS.ACTIVE, completedAt: null }));

      await service.completeGoal('goal-123');

      expect(await db.goals.get('goal-123')).toEqual(
        expect.objectContaining({
          status: GOAL_STATUS.COMPLETED,
          completedAt: expect.any(Number) as number,
        }),
      );
      expect(await balance()).toBe(startingBalance + 2000);
    });

    it('should not complete a goal if it is already completed', async () => {
      const completedGoal = storedGoal({ status: GOAL_STATUS.COMPLETED, completedAt: Date.now() });
      await db.goals.add(completedGoal);

      const completed = await service.completeGoal('goal-123');

      expect(completed).toBe(false);
      expect(await db.goals.get('goal-123')).toEqual(completedGoal);
      expect(await balance()).toBe(startingBalance);
    });

    it('should credit the reward once when the goal is completed twice at the same time', async () => {
      await db.goals.add(storedGoal({ status: GOAL_STATUS.ACTIVE, completedAt: null }));

      const results = await Promise.all([service.completeGoal('goal-123'), service.completeGoal('goal-123')]);

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await balance()).toBe(startingBalance + 2000);
    });

    it('should deduct the reward once when the completion is undone twice at the same time', async () => {
      await db.goals.add(storedGoal({ status: GOAL_STATUS.COMPLETED, completedAt: Date.now() }));

      const results = await Promise.all([service.undoCompleteGoal('goal-123'), service.undoCompleteGoal('goal-123')]);

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await balance()).toBe(startingBalance - 2000);
    });

    it('should undo complete a goal, reset status to ACTIVE, and deduct reward from balance', async () => {
      const completedGoal = storedGoal({ status: GOAL_STATUS.COMPLETED, completedAt: Date.now() });
      await db.goals.add(completedGoal);

      await service.undoCompleteGoal('goal-123');

      expect(await db.goals.get('goal-123')).toEqual({
        ...completedGoal,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
      });
      expect(await balance()).toBe(startingBalance - 2000);
    });

    it('should refuse to undo when an active goal already has the same title', async () => {
      const completedGoal = storedGoal({ status: GOAL_STATUS.COMPLETED, completedAt: Date.now() });
      await db.goals.bulkAdd([completedGoal, activeGoal('goal-456', 'DO 50 PUSH-UPS ON FISTS', 500)]);

      await expect(service.undoCompleteGoal('goal-123')).rejects.toThrow('an active goal already has this title');
      expect(await db.goals.get('goal-123')).toEqual(completedGoal);
      expect(await balance()).toBe(startingBalance);
    });
  });

  describe('deleteGoal', () => {
    it('should delete goal from database', async () => {
      await db.goals.add(storedGoal({ status: GOAL_STATUS.ACTIVE, completedAt: null }));

      await service.deleteGoal('goal-123');

      expect(await db.goals.get('goal-123')).toBeUndefined();
    });
  });
});
