import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoalService } from './goal.service';
import { DbService } from '../../../core/services/db.service';
import { UserService } from '../../../core/services/user.service';
import { Goal, GOAL_STATUS } from '../models/goal.model';

const TEST_GOAL_ID = 'goal-123';
const TEST_GOAL_TITLE = 'do 50 push-ups on fists';
const TEST_NEW_TITLE = 'do 100 push-ups';
const TEST_REWARD_VALUE = 2000;
const TEST_UPDATED_REWARD = 2500;
const ERROR_DUPLICATE_GOAL_TITLE = 'A goal with this title already exists.';

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
      transaction: vi.fn().mockImplementation(async (_mode, _t1, _t2, callback) => {
        await callback();
      }),
    };

    userMock = {
      addBalance: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        GoalService,
        { provide: DbService, useValue: dbMock },
        { provide: UserService, useValue: userMock },
      ],
    });

    service = TestBed.inject(GoalService);
  });

  describe('Live Queries', () => {
    it('should return live query for active goals', () => {
      const result = service.getActiveGoals();
      expect(result).toBeTruthy();
    });

    it('should return live query for completed goals', () => {
      const result = service.getCompletedGoals();
      expect(result).toBeTruthy();
    });
  });

  describe('addGoal', () => {
    it('should add a new active goal when title is unique', async () => {
      dbMock.goals.toArray.mockResolvedValue([]);

      await service.addGoal(TEST_GOAL_TITLE, TEST_REWARD_VALUE);

      expect(dbMock.goals.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: TEST_GOAL_TITLE,
          rewardValue: TEST_REWARD_VALUE,
          status: GOAL_STATUS.ACTIVE,
          completedAt: null,
        })
      );
    });

    it('should throw error when adding a goal with duplicate title (case-insensitive)', async () => {
      const existingGoals: Goal[] = [
        {
          id: 'existing-1',
          title: TEST_GOAL_TITLE.toUpperCase(),
          rewardValue: 1000,
          status: GOAL_STATUS.ACTIVE,
          completedAt: null,
          createdAt: Date.now(),
        },
      ];
      dbMock.goals.toArray.mockResolvedValue(existingGoals);

      await expect(service.addGoal(TEST_GOAL_TITLE.toLowerCase(), TEST_REWARD_VALUE)).rejects.toThrow(
        ERROR_DUPLICATE_GOAL_TITLE
      );
      expect(dbMock.goals.add).not.toHaveBeenCalled();
    });
  });

  describe('updateGoal', () => {
    it('should update title and reward for an active goal', async () => {
      const activeGoal: Goal = {
        id: TEST_GOAL_ID,
        title: TEST_GOAL_TITLE,
        rewardValue: TEST_REWARD_VALUE,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now(),
      };
      dbMock.goals.get.mockResolvedValue(activeGoal);
      dbMock.goals.toArray.mockResolvedValue([activeGoal]);

      await service.updateGoal(TEST_GOAL_ID, TEST_NEW_TITLE, TEST_UPDATED_REWARD);

      expect(dbMock.goals.update).toHaveBeenCalledWith(TEST_GOAL_ID, {
        title: TEST_NEW_TITLE,
        rewardValue: TEST_UPDATED_REWARD,
      });
    });

    it('should throw error when updating goal title to an existing another active goal title', async () => {
      const currentGoal: Goal = {
        id: TEST_GOAL_ID,
        title: TEST_GOAL_TITLE,
        rewardValue: TEST_REWARD_VALUE,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now(),
      };
      const anotherGoal: Goal = {
        id: 'other-id',
        title: TEST_NEW_TITLE,
        rewardValue: 500,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now(),
      };

      dbMock.goals.get.mockResolvedValue(currentGoal);
      dbMock.goals.toArray.mockResolvedValue([currentGoal, anotherGoal]);

      await expect(service.updateGoal(TEST_GOAL_ID, TEST_NEW_TITLE, TEST_UPDATED_REWARD)).rejects.toThrow(
        ERROR_DUPLICATE_GOAL_TITLE
      );
      expect(dbMock.goals.update).not.toHaveBeenCalled();
    });

    it('should do nothing if goal is not found or not active', async () => {
      dbMock.goals.get.mockResolvedValue(undefined);

      await service.updateGoal(TEST_GOAL_ID, TEST_NEW_TITLE, TEST_UPDATED_REWARD);

      expect(dbMock.goals.update).not.toHaveBeenCalled();
    });
  });

  describe('completeGoal and undoCompleteGoal', () => {
    it('should complete an active goal, set timestamp, and add reward to user balance', async () => {
      const activeGoal: Goal = {
        id: TEST_GOAL_ID,
        title: TEST_GOAL_TITLE,
        rewardValue: TEST_REWARD_VALUE,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now(),
      };
      dbMock.goals.get.mockResolvedValue(activeGoal);

      await service.completeGoal(TEST_GOAL_ID);

      expect(dbMock.goals.update).toHaveBeenCalledWith(
        TEST_GOAL_ID,
        expect.objectContaining({
          status: GOAL_STATUS.COMPLETED,
        })
      );
      expect(userMock.addBalance).toHaveBeenCalledWith(TEST_REWARD_VALUE);
    });

    it('should not complete a goal if it is already completed', async () => {
      const completedGoal: Goal = {
        id: TEST_GOAL_ID,
        title: TEST_GOAL_TITLE,
        rewardValue: TEST_REWARD_VALUE,
        status: GOAL_STATUS.COMPLETED,
        completedAt: Date.now(),
        createdAt: Date.now(),
      };
      dbMock.goals.get.mockResolvedValue(completedGoal);

      await service.completeGoal(TEST_GOAL_ID);

      expect(dbMock.goals.update).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });

    it('should undo complete a goal, reset status to ACTIVE, and deduct reward from balance', async () => {
      const completedGoal: Goal = {
        id: TEST_GOAL_ID,
        title: TEST_GOAL_TITLE,
        rewardValue: TEST_REWARD_VALUE,
        status: GOAL_STATUS.COMPLETED,
        completedAt: Date.now(),
        createdAt: Date.now(),
      };
      dbMock.goals.get.mockResolvedValue(completedGoal);

      await service.undoCompleteGoal(TEST_GOAL_ID);

      expect(dbMock.goals.update).toHaveBeenCalledWith(TEST_GOAL_ID, {
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
      });
      expect(userMock.addBalance).toHaveBeenCalledWith(-TEST_REWARD_VALUE);
    });
  });

  describe('deleteGoal', () => {
    it('should delete goal from database', async () => {
      await service.deleteGoal(TEST_GOAL_ID);
      expect(dbMock.goals.delete).toHaveBeenCalledWith(TEST_GOAL_ID);
    });
  });
});
