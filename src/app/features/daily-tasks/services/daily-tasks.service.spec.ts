import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { DailyTasksService } from './daily-tasks.service';
import { DbService } from '../../../database/db.service';
import { UserService } from '../../../core/services/user.service';
import type { DailyTask } from '../../../core/models/daily-task.model';
import type { DailyTaskDifficulty } from '../../../core/models/daily-task-difficulty.model';

vi.mock('dexie', () => {
  class MockDexie {
    readonly isMock = true;
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

const easy: DailyTaskDifficulty = { id: 'easy', name: 'Easy', baseReward: 100 };
const hard: DailyTaskDifficulty = { id: 'hard', name: 'Hard', baseReward: 300 };
const ONE_DAY_MS = 86_400_000;

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
    // IndexedDB runs overlapping read-write transactions on the same tables one after another.
    let queue: Promise<unknown> = Promise.resolve();
    dbMock = {
      dailyTasks: {
        toArray: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(null),
        add: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(1),
      },
      dailyTaskCompletions: {
        add: vi.fn().mockResolvedValue(undefined),
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
      providers: [
        DailyTasksService,
        { provide: DbService, useValue: dbMock },
        { provide: UserService, useValue: userMock },
      ],
    });

    service = TestBed.inject(DailyTasksService);
  });

  it('should create a new daily task with initial streak 0 and null lastCompletedAt', async () => {
    const difficulties = [easy, hard];

    await service.createTask('Morning Workout', difficulties);

    expect(dbMock.dailyTasks.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Morning Workout',
        difficulties,
        streak: 0,
        lastCompletedAt: null,
      }),
    );
  });

  describe('tasks$ stream', () => {
    it('should emit tasks from database', async () => {
      const mockTask: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
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

    it('should reset broken streak to 0 in stream when task was missed for more than 1 day', async () => {
      const staleTask: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
        createdAt: Date.now() - 10 * ONE_DAY_MS,
        streak: 5,
        lastCompletedAt: Date.now() - 2 * ONE_DAY_MS,
      };
      dbMock.dailyTasks.toArray.mockResolvedValue([staleTask]);

      const tasks = await firstValueFrom(service.tasks$);

      expect(tasks[0].streak).toBe(0);
      expect(dbMock.dailyTasks.update).not.toHaveBeenCalled();
    });

    it('should persist broken streak reset to DB via resetBrokenStreaks', async () => {
      const staleTask: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
        createdAt: Date.now() - 10 * ONE_DAY_MS,
        streak: 5,
        lastCompletedAt: Date.now() - 2 * ONE_DAY_MS,
      };
      dbMock.dailyTasks.toArray.mockResolvedValue([staleTask]);

      await service.resetBrokenStreaks();

      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith('test-daily-task-1', { streak: 0 });
    });

    it('should maintain streak when task was completed yesterday', async () => {
      const yesterdayTask: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
        createdAt: Date.now() - 5 * ONE_DAY_MS,
        streak: 5,
        lastCompletedAt: Date.now() - ONE_DAY_MS,
      };
      dbMock.dailyTasks.toArray.mockResolvedValue([yesterdayTask]);

      const tasks = await firstValueFrom(service.tasks$);

      expect(tasks[0].streak).toBe(5);
      expect(dbMock.dailyTasks.update).not.toHaveBeenCalled();
    });

    it('should return the same observable instance without creating dangling queries', () => {
      const stream1 = service.tasks$;
      const stream2 = service.tasks$;
      expect(stream1).toBe(stream2);
    });
  });

  describe('completeTask and Reward Scaling', () => {
    it('should complete task for first time, set streak to 1, and add base reward', async () => {
      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
        createdAt: Date.now() - ONE_DAY_MS,
        streak: 0,
        lastCompletedAt: null,
      };

      await service.completeTask(task, easy);

      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith(
        'test-daily-task-1',
        expect.objectContaining({
          streak: 1,
        }),
      );
      expect(userMock.addBalance).toHaveBeenCalledWith(easy.baseReward);
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
        difficulties: [easy],
        createdAt: now - 6 * ONE_DAY_MS,
        streak: 5,
        lastCompletedAt: yesterday,
      };

      await service.completeTask(task, easy);

      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith(
        'test-daily-task-1',
        expect.objectContaining({
          streak: 6,
        }),
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
        difficulties: [hard],
        createdAt: now - 16 * ONE_DAY_MS,
        streak: 15,
        lastCompletedAt: yesterday,
      };

      await service.completeTask(task, hard);

      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith(
        'test-daily-task-1',
        expect.objectContaining({
          streak: 16,
        }),
      );
      expect(userMock.addBalance).toHaveBeenCalledWith(600);
    });

    it('should reset streak to 1 if task was missed for more than 1 day', async () => {
      const now = Date.now();
      const twoDaysAgo = now - 2 * ONE_DAY_MS;

      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
        createdAt: now - 10 * ONE_DAY_MS,
        streak: 5,
        lastCompletedAt: twoDaysAgo,
      };

      await service.completeTask(task, easy);

      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith(
        'test-daily-task-1',
        expect.objectContaining({
          streak: 1,
        }),
      );
      expect(userMock.addBalance).toHaveBeenCalledWith(easy.baseReward);
    });

    it('should record a completion in dailyTaskCompletions table with correct reward and date', async () => {
      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
        createdAt: Date.now() - ONE_DAY_MS,
        streak: 0,
        lastCompletedAt: null,
      };

      await service.completeTask(task, easy);

      expect(dbMock.dailyTaskCompletions.add).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'test-daily-task-1',
          difficultyId: easy.id,
          rewardEarned: easy.baseReward,
          date: expect.any(String) as unknown as string,
        }),
      );
    });

    it('should ignore a second completion on the same day', async () => {
      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
        createdAt: Date.now() - ONE_DAY_MS,
        streak: 5,
        lastCompletedAt: new Date().setHours(0, 0, 0, 0),
      };

      await service.completeTask(task, easy);

      expect(dbMock.dailyTasks.update).not.toHaveBeenCalled();
      expect(dbMock.dailyTaskCompletions.add).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });

    it('should record one completion when two difficulties are tapped at the same time', async () => {
      let stored: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy, hard],
        createdAt: Date.now() - ONE_DAY_MS,
        streak: 0,
        lastCompletedAt: null,
      };
      dbMock.dailyTasks.get.mockImplementation(() => ({ ...stored }));
      dbMock.dailyTasks.update.mockImplementation((_id: string, changes: Partial<DailyTask>) => {
        stored = { ...stored, ...changes };
        return 1;
      });

      await Promise.all([service.completeTask(stored, easy), service.completeTask(stored, hard)]);

      expect(dbMock.dailyTaskCompletions.add).toHaveBeenCalledTimes(1);
      expect(userMock.addBalance).toHaveBeenCalledTimes(1);
    });

    it('should ignore completion if difficulty baseReward is invalid or not finite', async () => {
      const now = Date.now();
      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
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
