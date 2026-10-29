import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
      delete: ReturnType<typeof vi.fn>;
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
        delete: vi.fn().mockResolvedValue(undefined),
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

  it('should put a new task at the end of the list', async () => {
    dbMock.dailyTasks.toArray.mockResolvedValue([
      { id: 'a', sortOrder: 5 },
      { id: 'b', sortOrder: 2 },
    ]);

    await service.createTask('Morning Workout', [easy]);

    expect(dbMock.dailyTasks.add).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 6 }));
  });

  it('should put the first task first', async () => {
    await service.createTask('Morning Workout', [easy]);

    expect(dbMock.dailyTasks.add).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 0 }));
  });

  it('should refuse to create a task whose reward is not a whole number of hryvnias, at least 1', async () => {
    for (const baseReward of [12.5, 0, NaN]) {
      await expect(
        service.createTask('Morning Workout', [easy, { id: 'bad', name: 'Bad', baseReward }]),
      ).rejects.toThrow('The reward for "Bad" must be a whole number of hryvnias, at least 1.');
    }

    expect(dbMock.dailyTasks.add).not.toHaveBeenCalled();
  });

  describe('tasks$ stream', () => {
    it('should emit tasks from database', async () => {
      const mockTask: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
        createdAt: Date.now(),
        sortOrder: 0,
        streak: 0,
        lastCompletedAt: null,
      };
      dbMock.dailyTasks.toArray.mockResolvedValue([mockTask]);

      const tasks = await firstValueFrom(service.tasks$);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('test-daily-task-1');
      expect(dbMock.dailyTasks.update).not.toHaveBeenCalled();
    });

    it('should emit the tasks in the order the user gave them', async () => {
      const listed = (id: string, sortOrder: number): DailyTask => ({
        id,
        title: id,
        difficulties: [easy],
        createdAt: 0,
        sortOrder,
        streak: 0,
        lastCompletedAt: null,
      });
      dbMock.dailyTasks.toArray.mockResolvedValue([listed('c', 2), listed('a', 0), listed('b', 1)]);

      const tasks = await firstValueFrom(service.tasks$);

      expect(tasks.map((task) => task.id)).toEqual(['a', 'b', 'c']);
    });

    it('should reset broken streak to 0 in stream when task was missed for more than 1 day', async () => {
      const staleTask: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
        createdAt: Date.now() - 10 * ONE_DAY_MS,
        sortOrder: 0,
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
        sortOrder: 0,
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
        sortOrder: 0,
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
        sortOrder: 0,
        streak: 0,
        lastCompletedAt: null,
      };

      dbMock.dailyTasks.get.mockResolvedValue(task);

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
      // Reward = 100 ₴ * 1.50 = 150 ₴.
      const now = Date.now();
      const yesterday = now - ONE_DAY_MS;

      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
        createdAt: now - 6 * ONE_DAY_MS,
        sortOrder: 0,
        streak: 5,
        lastCompletedAt: yesterday,
      };

      dbMock.dailyTasks.get.mockResolvedValue(task);

      const reward = await service.completeTask(task, easy);

      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith(
        'test-daily-task-1',
        expect.objectContaining({
          streak: 6,
        }),
      );
      expect(userMock.addBalance).toHaveBeenCalledWith(150);
      expect(reward).toBe(150);
    });

    it('should cap streak bonus at 100% (+10 days) for streaks of 11 or more', async () => {
      // Completed yesterday, streak was 15.
      // New streak = 16. Bonus days capped at 10.
      // Multiplier = 1 + (10 * 0.10) = 2.0.
      // Reward = 300 ₴ * 2.0 = 600 ₴.
      const now = Date.now();
      const yesterday = now - ONE_DAY_MS;

      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [hard],
        createdAt: now - 16 * ONE_DAY_MS,
        sortOrder: 0,
        streak: 15,
        lastCompletedAt: yesterday,
      };

      dbMock.dailyTasks.get.mockResolvedValue(task);

      await service.completeTask(task, hard);

      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith(
        'test-daily-task-1',
        expect.objectContaining({
          streak: 16,
        }),
      );
      expect(userMock.addBalance).toHaveBeenCalledWith(600);
    });

    it('should round the streak bonus to whole hryvnias', async () => {
      // New streak = 2, so the multiplier is 1.10: 25 ₴ * 1.10 = 27.50 ₴, paid as 28 ₴.
      const now = Date.now();
      const quarter: DailyTaskDifficulty = { id: 'quarter', name: 'Quarter', baseReward: 25 };
      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [quarter],
        createdAt: now - 2 * ONE_DAY_MS,
        sortOrder: 0,
        streak: 1,
        lastCompletedAt: now - ONE_DAY_MS,
      };

      dbMock.dailyTasks.get.mockResolvedValue(task);

      await service.completeTask(task, quarter);

      expect(userMock.addBalance).toHaveBeenCalledWith(28);
      expect(dbMock.dailyTaskCompletions.add).toHaveBeenCalledWith(expect.objectContaining({ rewardEarned: 28 }));
    });

    it('should reset streak to 1 if task was missed for more than 1 day', async () => {
      const now = Date.now();
      const twoDaysAgo = now - 2 * ONE_DAY_MS;

      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
        createdAt: now - 10 * ONE_DAY_MS,
        sortOrder: 0,
        streak: 5,
        lastCompletedAt: twoDaysAgo,
      };

      dbMock.dailyTasks.get.mockResolvedValue(task);

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
        sortOrder: 0,
        streak: 0,
        lastCompletedAt: null,
      };

      dbMock.dailyTasks.get.mockResolvedValue(task);

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
        sortOrder: 0,
        streak: 5,
        lastCompletedAt: new Date().setHours(0, 0, 0, 0),
      };

      dbMock.dailyTasks.get.mockResolvedValue(task);

      await expect(service.completeTask(task, easy)).resolves.toBeNull();

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
        sortOrder: 0,
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

    it('should refuse a difficulty whose reward is not above zero, and tell the user to edit the task', async () => {
      for (const baseReward of [NaN, 0, -500]) {
        const legacy: DailyTaskDifficulty = { id: 'legacy', name: 'Legacy', baseReward };
        const task: DailyTask = {
          id: 'test-daily-task-1',
          title: 'Morning Workout',
          difficulties: [easy, legacy],
          createdAt: Date.now() - ONE_DAY_MS,
          sortOrder: 0,
          streak: 5,
          lastCompletedAt: null,
        };
        dbMock.dailyTasks.get.mockResolvedValue(task);

        await expect(service.completeTask(task, legacy)).rejects.toThrow(/"Legacy".*Edit the task/);
      }

      expect(dbMock.dailyTasks.update).not.toHaveBeenCalled();
      expect(dbMock.dailyTaskCompletions.add).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });

    it('should credit nothing for a task deleted since it was shown', async () => {
      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
        createdAt: Date.now() - ONE_DAY_MS,
        sortOrder: 0,
        streak: 0,
        lastCompletedAt: null,
      };
      dbMock.dailyTasks.get.mockResolvedValue(undefined);

      await expect(service.completeTask(task, easy)).rejects.toThrow('This daily task no longer exists.');

      expect(dbMock.dailyTaskCompletions.add).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });

    it('should pay the stored reward when the task was edited since it was shown', async () => {
      const shown: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [hard],
        createdAt: Date.now() - ONE_DAY_MS,
        sortOrder: 0,
        streak: 0,
        lastCompletedAt: null,
      };
      dbMock.dailyTasks.get.mockResolvedValue({ ...shown, difficulties: [{ ...hard, baseReward: 50 }] });

      await service.completeTask(shown, hard);

      expect(userMock.addBalance).toHaveBeenCalledWith(50);
      expect(dbMock.dailyTaskCompletions.add).toHaveBeenCalledWith(expect.objectContaining({ rewardEarned: 50 }));
    });

    it('should credit nothing for a difficulty removed since the task was shown', async () => {
      const shown: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy, hard],
        createdAt: Date.now() - ONE_DAY_MS,
        sortOrder: 0,
        streak: 0,
        lastCompletedAt: null,
      };
      dbMock.dailyTasks.get.mockResolvedValue({ ...shown, difficulties: [easy] });

      await expect(service.completeTask(shown, hard)).rejects.toThrow(/"Hard"/);

      expect(dbMock.dailyTaskCompletions.add).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });
  });

  describe('rewardsFor', () => {
    const yesterday = new Date(2026, 9, 28, 12, 0).getTime();
    const task = (overrides: Partial<DailyTask>): DailyTask => ({
      id: 'test-daily-task-1',
      title: 'Morning Workout',
      difficulties: [easy, hard],
      createdAt: 0,
      sortOrder: 0,
      streak: 0,
      lastCompletedAt: null,
      ...overrides,
    });

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 29, 12, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should include the streak bonus that completing the task today earns', () => {
      // The streak goes on to 6, so the multiplier is 1.50.
      expect(service.rewardsFor(task({ streak: 5, lastCompletedAt: yesterday }))).toEqual([
        { difficulty: easy, reward: 150 },
        { difficulty: hard, reward: 450 },
      ]);
    });

    it('should offer the base rewards when completing the task starts a new streak', () => {
      const base = [
        { difficulty: easy, reward: 100 },
        { difficulty: hard, reward: 300 },
      ];

      expect(service.rewardsFor(task({ streak: 0, lastCompletedAt: null }))).toEqual(base);
      expect(service.rewardsFor(task({ streak: 5, lastCompletedAt: yesterday - ONE_DAY_MS }))).toEqual(base);
    });

    it('should offer nothing once the task is done today', () => {
      expect(service.rewardsFor(task({ streak: 5, lastCompletedAt: Date.now() }))).toEqual([]);
    });

    it('should price nothing for a reward that completing refuses to pay', () => {
      const legacy = [NaN, 0, -500, '100' as unknown as number].map((baseReward, i) => ({
        id: `legacy-${i}`,
        name: 'Legacy',
        baseReward,
      }));

      const rewards = service.rewardsFor(
        task({ difficulties: [easy, ...legacy], streak: 5, lastCompletedAt: yesterday }),
      );

      expect(rewards.map((r) => r.reward)).toEqual([150, null, null, null, null]);
    });

    it('should offer what completing the task then pays', async () => {
      const quarter: DailyTaskDifficulty = { id: 'quarter', name: 'Quarter', baseReward: 25 };
      for (const streak of [1, 3, 15]) {
        const shown = task({ difficulties: [quarter], streak, lastCompletedAt: yesterday });
        dbMock.dailyTasks.get.mockResolvedValue(shown);

        const [offered] = service.rewardsFor(shown);

        await expect(service.completeTask(shown, quarter)).resolves.toBe(offered.reward);
      }
    });
  });

  describe('updateTask', () => {
    const stored: DailyTask = {
      id: 'test-daily-task-1',
      title: 'Morning Workout',
      difficulties: [easy, hard],
      createdAt: Date.now() - 10 * ONE_DAY_MS,
      sortOrder: 0,
      streak: 7,
      lastCompletedAt: Date.now() - ONE_DAY_MS,
    };

    it('should save the new title and difficulties only', async () => {
      dbMock.dailyTasks.get.mockResolvedValue(stored);
      const harder: DailyTaskDifficulty = { ...hard, name: 'Harder', baseReward: 450 };

      await service.updateTask(stored.id, 'Evening Workout', [harder]);

      expect(dbMock.dailyTasks.update).toHaveBeenCalledTimes(1);
      expect(dbMock.dailyTasks.update).toHaveBeenCalledWith(stored.id, {
        title: 'Evening Workout',
        difficulties: [harder],
      });
    });

    it('should leave past completions and the balance alone', async () => {
      dbMock.dailyTasks.get.mockResolvedValue(stored);

      await service.updateTask(stored.id, 'Evening Workout', [easy]);

      expect(dbMock.dailyTaskCompletions.add).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });

    it('should refuse a reward that is not a whole number of hryvnias', async () => {
      dbMock.dailyTasks.get.mockResolvedValue(stored);

      await expect(service.updateTask(stored.id, 'Evening Workout', [{ ...easy, baseReward: 99.5 }])).rejects.toThrow(
        'The reward for "Easy" must be a whole number of hryvnias, at least 1.',
      );
      expect(dbMock.dailyTasks.update).not.toHaveBeenCalled();
    });

    it('should fail when the task no longer exists', async () => {
      dbMock.dailyTasks.get.mockResolvedValue(undefined);

      await expect(service.updateTask('gone', 'Evening Workout', [easy])).rejects.toThrow();
      expect(dbMock.dailyTasks.update).not.toHaveBeenCalled();
    });
  });

  describe('reorder', () => {
    it('should number the tasks in the order given, in one transaction', async () => {
      await service.reorder(['c', 'a', 'b']);

      expect(dbMock.transaction).toHaveBeenCalledTimes(1);
      expect(dbMock.dailyTasks.update.mock.calls).toEqual([
        ['c', { sortOrder: 0 }],
        ['a', { sortOrder: 1 }],
        ['b', { sortOrder: 2 }],
      ]);
    });
  });

  describe('completionsOn', () => {
    it('should emit the completions recorded on the day', async () => {
      const completion = { id: 'c1', taskId: 't', date: '2026-09-30', difficultyId: 'easy', rewardEarned: 100 };
      const equals = vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([completion]) });
      const where = vi.fn().mockReturnValue({ equals });
      Object.assign(dbMock.dailyTaskCompletions, { where });

      const completions = await firstValueFrom(service.completionsOn('2026-09-30'));

      expect(where).toHaveBeenCalledWith('date');
      expect(equals).toHaveBeenCalledWith('2026-09-30');
      expect(completions).toEqual([completion]);
    });
  });

  describe('deleteTask', () => {
    it('should delete the task and keep its completions and the balance', async () => {
      await service.deleteTask('test-daily-task-1');

      expect(dbMock.dailyTasks.delete).toHaveBeenCalledWith('test-daily-task-1');
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });
  });
});
