import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { DailyTasksService } from './daily-tasks.service';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import { CURRENT_USER_ID } from '../../../core/models/user.model';
import type { DailyTask } from '../../../core/models/daily-task.model';
import type { DailyTaskDifficulty } from '../../../core/models/daily-task-difficulty.model';
import type { DailyTaskCompletion } from '../../../core/models/daily-task-completion.model';

const easy: DailyTaskDifficulty = { id: 'easy', name: 'Easy', baseReward: 100 };
const hard: DailyTaskDifficulty = { id: 'hard', name: 'Hard', baseReward: 300 };
const ONE_DAY_MS = 86_400_000;
const INITIAL_BALANCE = 1000;

describe('DailyTasksService', () => {
  let service: DailyTasksService;
  let db: DbService;

  const balance = async () => (await db.users.get(CURRENT_USER_ID))?.balance;
  const storedTask = (id = 'test-daily-task-1') => db.dailyTasks.get(id);

  beforeEach(async () => {
    db = await openEmptyDb();
    await db.users.add({ id: CURRENT_USER_ID, name: 'Current', balance: INITIAL_BALANCE, createdAt: 0, updatedAt: 0 });
    service = TestBed.inject(DailyTasksService);
  });

  it('should create a new daily task with initial streak 0 and null lastCompletedAt', async () => {
    const difficulties = [easy, hard];

    await service.createTask('Morning Workout', difficulties);

    expect(await db.dailyTasks.toArray()).toEqual([
      expect.objectContaining({
        title: 'Morning Workout',
        difficulties,
        streak: 0,
        lastCompletedAt: null,
      }),
    ]);
  });

  it('should put a new task at the end of the list', async () => {
    const listed = (id: string, sortOrder: number): DailyTask => ({
      id,
      title: id,
      difficulties: [easy],
      createdAt: 0,
      sortOrder,
      streak: 0,
      lastCompletedAt: null,
    });
    await db.dailyTasks.bulkAdd([listed('a', 5), listed('b', 2)]);

    await service.createTask('Morning Workout', [easy]);

    const created = await db.dailyTasks.filter((task) => task.title === 'Morning Workout').first();
    expect(created?.sortOrder).toBe(6);
  });

  it('should put the first task first', async () => {
    await service.createTask('Morning Workout', [easy]);

    expect((await db.dailyTasks.toArray())[0].sortOrder).toBe(0);
  });

  it('should refuse to create a task whose reward is not a whole number of hryvnias, at least 1', async () => {
    for (const baseReward of [12.5, 0, NaN]) {
      await expect(
        service.createTask('Morning Workout', [easy, { id: 'bad', name: 'Bad', baseReward }]),
      ).rejects.toThrow('The reward for "Bad" must be a whole number of hryvnias, at least 1.');
    }

    expect(await db.dailyTasks.count()).toBe(0);
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
      await db.dailyTasks.add(mockTask);

      const tasks = await firstValueFrom(service.tasks$);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('test-daily-task-1');
      expect(await storedTask()).toEqual(mockTask);
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
      await db.dailyTasks.bulkAdd([listed('c', 2), listed('a', 0), listed('b', 1)]);

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
      await db.dailyTasks.add(staleTask);

      const tasks = await firstValueFrom(service.tasks$);

      expect(tasks[0].streak).toBe(0);
      expect((await storedTask())?.streak).toBe(5);
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
      await db.dailyTasks.add(staleTask);

      await service.resetBrokenStreaks();

      expect(await storedTask()).toEqual({ ...staleTask, streak: 0 });
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
      await db.dailyTasks.add(yesterdayTask);

      const tasks = await firstValueFrom(service.tasks$);

      expect(tasks[0].streak).toBe(5);
      expect(await storedTask()).toEqual(yesterdayTask);
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
      await db.dailyTasks.add(task);

      await service.completeTask(task, easy);

      expect((await storedTask())?.streak).toBe(1);
      expect(await balance()).toBe(INITIAL_BALANCE + easy.baseReward);
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
      await db.dailyTasks.add(task);

      const reward = await service.completeTask(task, easy);

      expect((await storedTask())?.streak).toBe(6);
      expect(await balance()).toBe(INITIAL_BALANCE + 150);
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
      await db.dailyTasks.add(task);

      await service.completeTask(task, hard);

      expect((await storedTask())?.streak).toBe(16);
      expect(await balance()).toBe(INITIAL_BALANCE + 600);
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
      await db.dailyTasks.add(task);

      await service.completeTask(task, quarter);

      expect(await balance()).toBe(INITIAL_BALANCE + 28);
      expect(await db.dailyTaskCompletions.toArray()).toEqual([expect.objectContaining({ rewardEarned: 28 })]);
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
      await db.dailyTasks.add(task);

      await service.completeTask(task, easy);

      expect((await storedTask())?.streak).toBe(1);
      expect(await balance()).toBe(INITIAL_BALANCE + easy.baseReward);
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
      await db.dailyTasks.add(task);

      await service.completeTask(task, easy);

      expect(await db.dailyTaskCompletions.toArray()).toEqual([
        expect.objectContaining({
          taskId: 'test-daily-task-1',
          difficultyId: easy.id,
          rewardEarned: easy.baseReward,
          date: expect.any(String) as unknown as string,
        }),
      ]);
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
      await db.dailyTasks.add(task);

      await expect(service.completeTask(task, easy)).resolves.toBeNull();

      expect(await storedTask()).toEqual(task);
      expect(await db.dailyTaskCompletions.count()).toBe(0);
      expect(await balance()).toBe(INITIAL_BALANCE);
    });

    it('should record one completion when two difficulties are tapped at the same time', async () => {
      const stored: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy, hard],
        createdAt: Date.now() - ONE_DAY_MS,
        sortOrder: 0,
        streak: 0,
        lastCompletedAt: null,
      };
      await db.dailyTasks.add(stored);

      const rewards = await Promise.all([service.completeTask(stored, easy), service.completeTask(stored, hard)]);

      const [completion] = await db.dailyTaskCompletions.toArray();
      expect(await db.dailyTaskCompletions.count()).toBe(1);
      expect(await balance()).toBe(INITIAL_BALANCE + completion.rewardEarned);
      expect(rewards.filter((reward) => reward === null)).toHaveLength(1);
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
        await db.dailyTasks.put(task);

        await expect(service.completeTask(task, legacy)).rejects.toThrow(/"Legacy".*Edit the task/);
        expect(await storedTask()).toEqual(task);
      }

      expect(await db.dailyTaskCompletions.count()).toBe(0);
      expect(await balance()).toBe(INITIAL_BALANCE);
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

      await expect(service.completeTask(task, easy)).rejects.toThrow('This daily task no longer exists.');

      expect(await db.dailyTaskCompletions.count()).toBe(0);
      expect(await balance()).toBe(INITIAL_BALANCE);
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
      await db.dailyTasks.add({ ...shown, difficulties: [{ ...hard, baseReward: 50 }] });

      await service.completeTask(shown, hard);

      expect(await balance()).toBe(INITIAL_BALANCE + 50);
      expect(await db.dailyTaskCompletions.toArray()).toEqual([expect.objectContaining({ rewardEarned: 50 })]);
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
      await db.dailyTasks.add({ ...shown, difficulties: [easy] });

      await expect(service.completeTask(shown, hard)).rejects.toThrow(/"Hard"/);

      expect(await db.dailyTaskCompletions.count()).toBe(0);
      expect(await balance()).toBe(INITIAL_BALANCE);
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
        await db.dailyTasks.put(shown);

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

    beforeEach(async () => {
      await db.dailyTasks.add(stored);
    });

    it('should save the new title and difficulties only', async () => {
      const harder: DailyTaskDifficulty = { ...hard, name: 'Harder', baseReward: 450 };

      await service.updateTask(stored.id, 'Evening Workout', [harder]);

      expect(await storedTask(stored.id)).toEqual({
        ...stored,
        title: 'Evening Workout',
        difficulties: [harder],
      });
    });

    it('should leave past completions and the balance alone', async () => {
      const completion: DailyTaskCompletion = {
        id: 'c1',
        taskId: stored.id,
        date: '2026-09-30',
        difficultyId: 'hard',
        rewardEarned: 300,
        completedAt: 0,
      };
      await db.dailyTaskCompletions.add(completion);

      await service.updateTask(stored.id, 'Evening Workout', [easy]);

      expect(await db.dailyTaskCompletions.toArray()).toEqual([completion]);
      expect(await balance()).toBe(INITIAL_BALANCE);
    });

    it('should refuse a reward that is not a whole number of hryvnias', async () => {
      await expect(service.updateTask(stored.id, 'Evening Workout', [{ ...easy, baseReward: 99.5 }])).rejects.toThrow(
        'The reward for "Easy" must be a whole number of hryvnias, at least 1.',
      );
      expect(await storedTask(stored.id)).toEqual(stored);
    });

    it('should fail when the task no longer exists', async () => {
      await expect(service.updateTask('gone', 'Evening Workout', [easy])).rejects.toThrow();
      expect(await db.dailyTasks.toArray()).toEqual([stored]);
    });
  });

  describe('reorder', () => {
    it('should number the tasks in the order given', async () => {
      const listed = (id: string, sortOrder: number): DailyTask => ({
        id,
        title: id,
        difficulties: [easy],
        createdAt: 0,
        sortOrder,
        streak: 0,
        lastCompletedAt: null,
      });
      await db.dailyTasks.bulkAdd([listed('a', 0), listed('b', 1), listed('c', 2)]);

      await service.reorder(['c', 'a', 'b']);

      const sortOrders = Object.fromEntries((await db.dailyTasks.toArray()).map((task) => [task.id, task.sortOrder]));
      expect(sortOrders).toEqual({ c: 0, a: 1, b: 2 });
    });
  });

  describe('completionsOn', () => {
    it('should emit the completions recorded on the day', async () => {
      const completion: DailyTaskCompletion = {
        id: 'c1',
        taskId: 't',
        date: '2026-09-30',
        difficultyId: 'easy',
        rewardEarned: 100,
        completedAt: 0,
      };
      await db.dailyTaskCompletions.bulkAdd([completion, { ...completion, id: 'c2', date: '2026-10-01' }]);

      const completions = await firstValueFrom(service.completionsOn('2026-09-30'));

      expect(completions).toEqual([completion]);
    });
  });

  describe('deleteTask', () => {
    it('should delete the task and keep its completions and the balance', async () => {
      const task: DailyTask = {
        id: 'test-daily-task-1',
        title: 'Morning Workout',
        difficulties: [easy],
        createdAt: 0,
        sortOrder: 0,
        streak: 0,
        lastCompletedAt: null,
      };
      const completion: DailyTaskCompletion = {
        id: 'c1',
        taskId: task.id,
        date: '2026-09-30',
        difficultyId: 'easy',
        rewardEarned: 100,
        completedAt: 0,
      };
      await db.dailyTasks.add(task);
      await db.dailyTaskCompletions.add(completion);

      await service.deleteTask('test-daily-task-1');

      expect(await storedTask()).toBeUndefined();
      expect(await db.dailyTaskCompletions.toArray()).toEqual([completion]);
      expect(await balance()).toBe(INITIAL_BALANCE);
    });
  });
});
