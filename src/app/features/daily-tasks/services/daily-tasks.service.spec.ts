import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { DailyTasksService } from './daily-tasks.service';
import { DbService } from '../../../core/services/db.service';
import { UserService } from '../../../core/services/user.service';
import { DailyTask } from '../models/daily-task.model';
import { DailyTaskDifficulty } from '../models/daily-task-difficulty.model';

vi.mock('dexie', () => {
  class MockDexie {}
  return {
    default: MockDexie,
    Dexie: MockDexie,
    liveQuery: (fn: () => unknown) => ({
      '@@observable'() {
        return {
          subscribe(subscriber: { next: (val: unknown) => void; complete: () => void; error: (err: unknown) => void }) {
            Promise.resolve().then(fn).then(
              (val) => {
                subscriber.next(val);
                subscriber.complete();
              },
              (err) => subscriber.error(err)
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

const EASY_DIFFICULTY: DailyTaskDifficulty = { id: 'easy', name: 'Easy', baseReward: 100 };
const HARD_DIFFICULTY: DailyTaskDifficulty = { id: 'hard', name: 'Hard', baseReward: 300 };
const ONE_DAY_MS = 86_400_000;
const TWO_DAYS_MS = 172_800_000;



describe('DailyTasksService', () => {
  let service: DailyTasksService;
  let dbMock: {
    dailyTasks: {
      toArray: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
      add: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    dailyTaskCompletions: {
      add: ReturnType<typeof vi.fn>;
    };
    users: unknown;
    transaction: ReturnType<typeof vi.fn>;
  };
  let userMock: {
    addBalance: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    dbMock = {
      dailyTasks: {
        toArray: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockImplementation(async () => null),
        add: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(1),
      },
      dailyTaskCompletions: {
        add: vi.fn().mockResolvedValue(undefined),
      },
      users: {},
      transaction: vi.fn().mockImplementation(async (...args: unknown[]) => {
        const callback = args[args.length - 1] as () => Promise<void>;
        await callback();
      }),
    };

    userMock = {
      addBalance: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        DailyTasksService,
        { provide: DbService, useValue: dbMock },
        { provide: UserService, useValue: userMock },
      ],
    });

    service = TestBed.inject(DailyTasksService);
  });

  it('should create a new daily task with initial streak 0 and null lastCompletedAt', async () => {
    const difficulties = [EASY_DIFFICULTY, HARD_DIFFICULTY];

    await service.createTask('Morning Workout', difficulties);

    expect(dbMock.dailyTasks.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Morning Workout',
        difficulties,
        streak: 0,
        lastCompletedAt: null,
      })
    );
  });

  describe('tasks$ stream', () => {
    it('should emit tasks from database', async () => {
      const mockTask: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [EASY_DIFFICULTY],
        createdAt: Date.now(),
        streak: 0,
        lastCompletedAt: null,
      };
      dbMock.dailyTasks.toArray.mockResolvedValue([mockTask]);

      const tasks = await firstValueFrom(service.tasks$);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('test-daily-task-1');
      expect(dbMock.dailyTasks.update).not.toHaveBeenCalled();
    });

    it('should reset broken streak to 0 and persist to DB when task was missed for more than 1 day', async () => {
      const staleTask: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [EASY_DIFFICULTY],
        createdAt: Date.now() - (10 * ONE_DAY_MS),
        streak: 5,
        lastCompletedAt: Date.now() - TWO_DAYS_MS,
      };
      dbMock.dailyTasks.toArray.mockResolvedValue([staleTask]);

      const tasks = await firstValueFrom(service.tasks$);

      expect(tasks[0].streak).toBe(0);
      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith('test-daily-task-1', { streak: 0 });
    });

    it('should maintain streak when task was completed yesterday', async () => {
      const yesterdayTask: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [EASY_DIFFICULTY],
        createdAt: Date.now() - (5 * ONE_DAY_MS),
        streak: 5,
        lastCompletedAt: Date.now() - ONE_DAY_MS,
      };
      dbMock.dailyTasks.toArray.mockResolvedValue([yesterdayTask]);

      const tasks = await firstValueFrom(service.tasks$);

      expect(tasks[0].streak).toBe(5);
      expect(dbMock.dailyTasks.update).not.toHaveBeenCalled();
    });
  });

  describe('completeTask and Reward Scaling', () => {
    it('should complete task for first time, set streak to 1, and add base reward', async () => {
      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [EASY_DIFFICULTY],
        createdAt: Date.now() - ONE_DAY_MS,
        streak: 0,
        lastCompletedAt: null,
      };

      await service.completeTask(task, EASY_DIFFICULTY);

      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith(
        'test-daily-task-1',
        expect.objectContaining({
          streak: 1,
        })
      );
      expect(userMock.addBalance).toHaveBeenCalledWith(EASY_DIFFICULTY.baseReward);
    });

    it('should increment streak and apply 50% bonus on 6th consecutive day', async () => {
      // Completed yesterday, streak was 5.
      // New streak = 6. Bonus days = 6 - 1 = 5.
      // Multiplier = 1 + (5 * 0.10) = 1.50.
      // Reward = 100 * 1.50 = 150.
      const now = Date.now();
      const yesterday = now - ONE_DAY_MS;

      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [EASY_DIFFICULTY],
        createdAt: now - (6 * ONE_DAY_MS),
        streak: 5,
        lastCompletedAt: yesterday,
      };

      await service.completeTask(task, EASY_DIFFICULTY);

      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith(
        'test-daily-task-1',
        expect.objectContaining({
          streak: 6,
        })
      );
      expect(userMock.addBalance).toHaveBeenCalledWith(150);
    });

    it('should cap streak bonus at 100% (+10 days) for streaks of 11 or more', async () => {
      // Completed yesterday, streak was 15.
      // New streak = 16. Bonus days capped at 10.
      // Multiplier = 1 + (10 * 0.10) = 2.0.
      // Reward = 300 * 2.0 = 600.
      const now = Date.now();
      const yesterday = now - ONE_DAY_MS;

      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [HARD_DIFFICULTY],
        createdAt: now - (16 * ONE_DAY_MS),
        streak: 15,
        lastCompletedAt: yesterday,
      };

      await service.completeTask(task, HARD_DIFFICULTY);

      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith(
        'test-daily-task-1',
        expect.objectContaining({
          streak: 16,
        })
      );
      expect(userMock.addBalance).toHaveBeenCalledWith(600);
    });

    it('should reset streak to 1 if task was missed for more than 1 day', async () => {
      const now = Date.now();
      const twoDaysAgo = now - TWO_DAYS_MS;

      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [EASY_DIFFICULTY],
        createdAt: now - (10 * ONE_DAY_MS),
        streak: 5,
        lastCompletedAt: twoDaysAgo,
      };

      await service.completeTask(task, EASY_DIFFICULTY);

      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith(
        'test-daily-task-1',
        expect.objectContaining({
          streak: 1,
        })
      );
      expect(userMock.addBalance).toHaveBeenCalledWith(EASY_DIFFICULTY.baseReward);
    });

    it('should record a completion in dailyTaskCompletions table with correct reward and date', async () => {
      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [EASY_DIFFICULTY],
        createdAt: Date.now() - ONE_DAY_MS,
        streak: 0,
        lastCompletedAt: null,
      };

      await service.completeTask(task, EASY_DIFFICULTY);

      expect(dbMock.dailyTaskCompletions.add).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'test-daily-task-1',
          difficultyId: EASY_DIFFICULTY.id,
          rewardEarned: EASY_DIFFICULTY.baseReward,
          date: expect.any(String),
        })
      );
    });

    it('should keep current streak if completed on the same day', async () => {
      const now = Date.now();
      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [EASY_DIFFICULTY],
        createdAt: now - ONE_DAY_MS,
        streak: 5,
        lastCompletedAt: now - 1000, // completed earlier today
      };

      await service.completeTask(task, EASY_DIFFICULTY);

      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith(
        'test-daily-task-1',
        expect.objectContaining({
          streak: 5,
        })
      );
    });

    it('should ignore completion if difficulty baseReward is invalid or not finite', async () => {
      const now = Date.now();
      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [EASY_DIFFICULTY],
        createdAt: now - ONE_DAY_MS,
        streak: 5,
        lastCompletedAt: null,
      };

      const invalidDifficulty = { id: 'invalid', name: 'Invalid', baseReward: NaN };
      await service.completeTask(task, invalidDifficulty);

      expect(dbMock.dailyTasks.update).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });
  });
});
