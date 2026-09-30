import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { GoalService } from './goal.service';
import { DbService } from '../../../database/db.service';
import { UserService } from '../../../core/services/user.service';
import type { Goal } from '../../../core/models/goal.model';
import { GOAL_STATUS } from '../../../core/models/goal.model';

vi.mock('dexie', () => {
  class MockDexie {
    version = vi.fn();
  }
  return {
    default: MockDexie,
    Dexie: MockDexie,
    liveQuery: (fn: () => unknown) => ({
      '@@observable'() {
        return {
          subscribe(subscriber: { next: (val: unknown) => void; complete: () => void; error: (err: unknown) => void }) {
            Promise.resolve()
              .then(fn)
              .then(
                (val) => {
                  subscriber.next(val);
                  subscriber.complete();
                },
                (err: unknown) => {
                  subscriber.error(err);
                },
              );
            return {
              unsubscribe() {
                // no-op for test mock
              },
            };
          },
        };
      },
    }),
  };
});

describe('GoalService', () => {
  let service: GoalService;
  let dbMock: {
    goals: {
      where: ReturnType<typeof vi.fn>;
      equals: ReturnType<typeof vi.fn>;
      toArray: ReturnType<typeof vi.fn>;
      reverse: ReturnType<typeof vi.fn>;
      sortBy: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      add: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    users: unknown;
    transaction: ReturnType<typeof vi.fn>;
  };
  let userMock: {
    addBalance: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // IndexedDB runs overlapping read-write transactions on the same tables one after another.
    let queue: Promise<unknown> = Promise.resolve();
    dbMock = {
      goals: {
        where: vi.fn().mockReturnThis(),
        equals: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
        reverse: vi.fn().mockReturnThis(),
        sortBy: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(1),
        add: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      users: {},
      transaction: vi.fn((...args: unknown[]) => {
        const callback = args[args.length - 1] as () => Promise<unknown>;
        const run = queue.then(callback);
        queue = run.catch(() => undefined);
        return run;
      }),
    };

    userMock = {
      addBalance: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [GoalService, { provide: DbService, useValue: dbMock }, { provide: UserService, useValue: userMock }],
    });

    service = TestBed.inject(GoalService);
  });

  function useStoredGoal(state: Pick<Goal, 'status' | 'completedAt'>): void {
    let stored: Goal = {
      id: 'goal-123',
      title: 'do 50 push-ups on fists',
      rewardValue: 2000,
      createdAt: Date.now(),
      ...state,
    };
    dbMock.goals.get.mockImplementation(() => ({ ...stored }));
    dbMock.goals.update.mockImplementation((_id: string, changes: Partial<Goal>) => {
      stored = { ...stored, ...changes };
      return 1;
    });
  }

  describe('Live Queries', () => {
    it('should return live query and emit active goals filtered by status', async () => {
      const mockActiveGoals: Goal[] = [
        {
          id: 'goal-123',
          title: 'do 50 push-ups on fists',
          rewardValue: 2000,
          status: GOAL_STATUS.ACTIVE,
          completedAt: null,
          createdAt: Date.now(),
        },
      ];
      dbMock.goals.toArray.mockResolvedValue(mockActiveGoals);

      const result = await firstValueFrom(service.getActiveGoals());

      expect(dbMock.goals.where).toHaveBeenCalledWith('status');
      expect(dbMock.goals.equals).toHaveBeenCalledWith(GOAL_STATUS.ACTIVE);
      expect(result).toEqual(mockActiveGoals);
    });

    it('should return live query and emit completed goals sorted by completedAt', async () => {
      const mockCompletedGoals: Goal[] = [
        {
          id: 'goal-123',
          title: 'do 50 push-ups on fists',
          rewardValue: 2000,
          status: GOAL_STATUS.COMPLETED,
          completedAt: Date.now(),
          createdAt: Date.now() - 1000,
        },
      ];
      dbMock.goals.sortBy.mockResolvedValue(mockCompletedGoals);

      const result = await firstValueFrom(service.getCompletedGoals());

      expect(dbMock.goals.where).toHaveBeenCalledWith('status');
      expect(dbMock.goals.equals).toHaveBeenCalledWith(GOAL_STATUS.COMPLETED);
      expect(dbMock.goals.reverse).toHaveBeenCalled();
      expect(dbMock.goals.sortBy).toHaveBeenCalledWith('completedAt');
      expect(result).toEqual(mockCompletedGoals);
    });
  });

  describe('addGoal', () => {
    it('should add a new active goal when title is unique', async () => {
      dbMock.goals.toArray.mockResolvedValue([]);

      await service.addGoal('do 50 push-ups on fists', 2000);

      expect(dbMock.goals.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'do 50 push-ups on fists',
          rewardValue: 2000,
          status: GOAL_STATUS.ACTIVE,
          completedAt: null,
        }),
      );
    });

    it('should throw error when adding a goal with duplicate title (case-insensitive)', async () => {
      const existingGoals: Goal[] = [
        {
          id: 'existing-1',
          title: 'do 50 push-ups on fists'.toUpperCase(),
          rewardValue: 1000,
          status: GOAL_STATUS.ACTIVE,
          completedAt: null,
          createdAt: Date.now(),
        },
      ];
      dbMock.goals.toArray.mockResolvedValue(existingGoals);

      await expect(service.addGoal('do 50 push-ups on fists'.toLowerCase(), 2000)).rejects.toThrow(
        'A goal with this title already exists.',
      );
      expect(dbMock.goals.add).not.toHaveBeenCalled();
    });
  });

  describe('updateGoal', () => {
    it('should update title and reward for an active goal', async () => {
      const activeGoal: Goal = {
        id: 'goal-123',
        title: 'do 50 push-ups on fists',
        rewardValue: 2000,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now(),
      };
      dbMock.goals.get.mockResolvedValue(activeGoal);
      dbMock.goals.toArray.mockResolvedValue([activeGoal]);

      await service.updateGoal('goal-123', 'do 100 push-ups', 2500);

      expect(dbMock.goals.update).toHaveBeenCalledWith('goal-123', {
        title: 'do 100 push-ups',
        rewardValue: 2500,
      });
    });

    it('should throw error when updating goal title to an existing another active goal title', async () => {
      const currentGoal: Goal = {
        id: 'goal-123',
        title: 'do 50 push-ups on fists',
        rewardValue: 2000,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now(),
      };
      const anotherGoal: Goal = {
        id: 'other-id',
        title: 'do 100 push-ups',
        rewardValue: 500,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now(),
      };

      dbMock.goals.get.mockResolvedValue(currentGoal);
      dbMock.goals.toArray.mockResolvedValue([currentGoal, anotherGoal]);

      await expect(service.updateGoal('goal-123', 'do 100 push-ups', 2500)).rejects.toThrow(
        'A goal with this title already exists.',
      );
      expect(dbMock.goals.update).not.toHaveBeenCalled();
    });

    it('should do nothing if goal is not found or not active', async () => {
      dbMock.goals.get.mockResolvedValue(undefined);

      await service.updateGoal('goal-123', 'do 100 push-ups', 2500);

      expect(dbMock.goals.update).not.toHaveBeenCalled();
    });
  });

  describe('completeGoal and undoCompleteGoal', () => {
    it('should complete an active goal, set timestamp, and add reward to user balance', async () => {
      const activeGoal: Goal = {
        id: 'goal-123',
        title: 'do 50 push-ups on fists',
        rewardValue: 2000,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now(),
      };
      dbMock.goals.get.mockResolvedValue(activeGoal);

      await service.completeGoal('goal-123');

      expect(dbMock.goals.update).toHaveBeenCalledWith(
        'goal-123',
        expect.objectContaining({
          status: GOAL_STATUS.COMPLETED,
        }),
      );
      expect(userMock.addBalance).toHaveBeenCalledWith(2000);
    });

    it('should not complete a goal if it is already completed', async () => {
      const completedGoal: Goal = {
        id: 'goal-123',
        title: 'do 50 push-ups on fists',
        rewardValue: 2000,
        status: GOAL_STATUS.COMPLETED,
        completedAt: Date.now(),
        createdAt: Date.now(),
      };
      dbMock.goals.get.mockResolvedValue(completedGoal);

      const completed = await service.completeGoal('goal-123');

      expect(completed).toBe(false);
      expect(dbMock.goals.update).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });

    it('should credit the reward once when the goal is completed twice at the same time', async () => {
      useStoredGoal({ status: GOAL_STATUS.ACTIVE, completedAt: null });

      const results = await Promise.all([service.completeGoal('goal-123'), service.completeGoal('goal-123')]);

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(userMock.addBalance).toHaveBeenCalledTimes(1);
      expect(userMock.addBalance).toHaveBeenCalledWith(2000);
    });

    it('should deduct the reward once when the completion is undone twice at the same time', async () => {
      useStoredGoal({ status: GOAL_STATUS.COMPLETED, completedAt: Date.now() });

      const results = await Promise.all([service.undoCompleteGoal('goal-123'), service.undoCompleteGoal('goal-123')]);

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(userMock.addBalance).toHaveBeenCalledTimes(1);
      expect(userMock.addBalance).toHaveBeenCalledWith(-2000);
    });

    it('should undo complete a goal, reset status to ACTIVE, and deduct reward from balance', async () => {
      const completedGoal: Goal = {
        id: 'goal-123',
        title: 'do 50 push-ups on fists',
        rewardValue: 2000,
        status: GOAL_STATUS.COMPLETED,
        completedAt: Date.now(),
        createdAt: Date.now(),
      };
      dbMock.goals.get.mockResolvedValue(completedGoal);

      await service.undoCompleteGoal('goal-123');

      expect(dbMock.goals.update).toHaveBeenCalledWith('goal-123', {
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
      });
      expect(userMock.addBalance).toHaveBeenCalledWith(-2000);
    });

    it('should refuse to undo when an active goal already has the same title', async () => {
      useStoredGoal({ status: GOAL_STATUS.COMPLETED, completedAt: Date.now() });
      dbMock.goals.toArray.mockResolvedValue([
        {
          id: 'goal-456',
          title: 'DO 50 PUSH-UPS ON FISTS',
          rewardValue: 500,
          status: GOAL_STATUS.ACTIVE,
          completedAt: null,
          createdAt: Date.now(),
        },
      ]);

      await expect(service.undoCompleteGoal('goal-123')).rejects.toThrow('an active goal already has this title');
      expect(dbMock.goals.update).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });
  });

  describe('deleteGoal', () => {
    it('should delete goal from database', async () => {
      await service.deleteGoal('goal-123');
      expect(dbMock.goals.delete).toHaveBeenCalledWith('goal-123');
    });
  });
});
