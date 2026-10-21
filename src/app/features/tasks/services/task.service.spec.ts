import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { TaskService } from './task.service';
import { DbService } from '../../../database/db.service';
import { UserService } from '../../../core/services/user.service';
import type { DisciplineItem } from '../../../core/models/discipline-item.model';
import { DisciplineItemType } from '../../../core/models/discipline-item-type.enum';
import { TITLE_MAX_LENGTH } from '../../../shared/constants/text-length.const';
import { MAX_MONEY_AMOUNT } from '../../../shared/validators/money-amount';

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

describe('TaskService', () => {
  let service: TaskService;
  let dbMock: {
    tasks: {
      add: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      toArray: ReturnType<typeof vi.fn>;
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
      tasks: {
        add: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(1),
        delete: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
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
      providers: [TaskService, { provide: DbService, useValue: dbMock }, { provide: UserService, useValue: userMock }],
    });

    service = TestBed.inject(TaskService);
  });

  describe('tasks$ stream', () => {
    it('should sort pending tasks newest first (tie-broken by title) followed by completed tasks most recently completed first', async () => {
      const storedTasks: DisciplineItem[] = [
        {
          id: 'done-older',
          title: 'Done older',
          type: DisciplineItemType.ONEOFF,
          rewardValue: 50,
          isCompleted: true,
          lastCompletedAt: 1000,
          createdAt: 500,
        },
        {
          id: 'pending-older',
          title: 'Pending older',
          type: DisciplineItemType.ONEOFF,
          rewardValue: 30,
          isCompleted: false,
          lastCompletedAt: null,
          createdAt: 1000,
        },
        {
          id: 'done-newer',
          title: 'Done newer',
          type: DisciplineItemType.ONEOFF,
          rewardValue: 80,
          isCompleted: true,
          lastCompletedAt: 3000,
          createdAt: 400,
        },
        {
          id: 'pending-tie-b',
          title: 'B task',
          type: DisciplineItemType.ONEOFF,
          rewardValue: 40,
          isCompleted: false,
          lastCompletedAt: null,
          createdAt: 2000,
        },
        {
          id: 'pending-tie-a',
          title: 'A task',
          type: DisciplineItemType.ONEOFF,
          rewardValue: 40,
          isCompleted: false,
          lastCompletedAt: null,
          createdAt: 2000,
        },
      ];
      dbMock.tasks.toArray.mockResolvedValue(storedTasks);

      const tasks = await firstValueFrom(service.tasks$);

      expect(tasks.map((t) => t.id)).toEqual([
        'pending-tie-a',
        'pending-tie-b',
        'pending-older',
        'done-newer',
        'done-older',
      ]);
      expect(dbMock.transaction).not.toHaveBeenCalled();
      expect(dbMock.tasks.update).not.toHaveBeenCalled();
    });
  });

  describe('addTask', () => {
    it('should trim the title and add a ONEOFF task to the database', async () => {
      await service.addTask('  Pay internet bill  ', 50);

      expect(dbMock.tasks.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Pay internet bill',
          type: DisciplineItemType.ONEOFF,
          rewardValue: 50,
          isCompleted: false,
          lastCompletedAt: null,
        }),
      );
    });

    it('should reject an empty or whitespace-only title', async () => {
      await expect(service.addTask('   ', 50)).rejects.toThrow('Task title is required.');
      expect(dbMock.tasks.add).not.toHaveBeenCalled();
    });

    it('should reject a title exceeding TITLE_MAX_LENGTH', async () => {
      const longTitle = 'A'.repeat(TITLE_MAX_LENGTH + 1);
      await expect(service.addTask(longTitle, 50)).rejects.toThrow(
        `Task title cannot exceed ${TITLE_MAX_LENGTH} characters.`,
      );
      expect(dbMock.tasks.add).not.toHaveBeenCalled();
    });

    it('should reject non-integer or non-positive rewards', async () => {
      await expect(service.addTask('Pay bill', 0)).rejects.toThrow(
        'Task reward must be a whole number of hryvnias, at least 1.',
      );
      await expect(service.addTask('Pay bill', -10)).rejects.toThrow(
        'Task reward must be a whole number of hryvnias, at least 1.',
      );
      await expect(service.addTask('Pay bill', 12.5)).rejects.toThrow(
        'Task reward must be a whole number of hryvnias, at least 1.',
      );
      await expect(service.addTask('Pay bill', MAX_MONEY_AMOUNT + 1)).rejects.toThrow(
        `Task reward cannot exceed ${MAX_MONEY_AMOUNT} ₴.`,
      );
      expect(dbMock.tasks.add).not.toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    const pendingTask: DisciplineItem = {
      id: 't-1',
      title: 'Pay internet bill',
      type: DisciplineItemType.ONEOFF,
      rewardValue: 50,
      isCompleted: false,
      lastCompletedAt: null,
      createdAt: 1000,
    };

    it('should update title and rewardValue for a pending task', async () => {
      dbMock.tasks.get.mockResolvedValue(pendingTask);

      await service.updateTask('t-1', '  File quarterly taxes  ', 200);

      expect(dbMock.tasks.update).toHaveBeenCalledWith('t-1', {
        title: 'File quarterly taxes',
        rewardValue: 200,
      });
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });

    it('should throw when the task does not exist', async () => {
      dbMock.tasks.get.mockResolvedValue(undefined);

      await expect(service.updateTask('missing', 'Updated title', 100)).rejects.toThrow(
        'This one-off task no longer exists.',
      );
      expect(dbMock.tasks.update).not.toHaveBeenCalled();
    });

    it('should reject updating a completed task', async () => {
      dbMock.tasks.get.mockResolvedValue({ ...pendingTask, isCompleted: true, lastCompletedAt: 2000 });

      await expect(service.updateTask('t-1', 'Updated title', 100)).rejects.toThrow(
        'Completed tasks cannot be edited.',
      );
      expect(dbMock.tasks.update).not.toHaveBeenCalled();
    });

    it('should validate title and reward before updating', async () => {
      await expect(service.updateTask('t-1', '   ', 100)).rejects.toThrow('Task title is required.');
      await expect(service.updateTask('t-1', 'Valid', 0)).rejects.toThrow(
        'Task reward must be a whole number of hryvnias, at least 1.',
      );
      expect(dbMock.tasks.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    const pendingTask: DisciplineItem = {
      id: 't-1',
      title: 'Pay internet bill',
      type: DisciplineItemType.ONEOFF,
      rewardValue: 50,
      isCompleted: false,
      lastCompletedAt: null,
      createdAt: 1000,
    };

    it('should delete a pending task and leave user balance untouched', async () => {
      dbMock.tasks.get.mockResolvedValue(pendingTask);

      await service.deleteTask('t-1');

      expect(dbMock.tasks.delete).toHaveBeenCalledWith('t-1');
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });

    it('should reject deleting a completed task', async () => {
      dbMock.tasks.get.mockResolvedValue({ ...pendingTask, isCompleted: true, lastCompletedAt: 2000 });

      await expect(service.deleteTask('t-1')).rejects.toThrow('Completed tasks cannot be deleted.');
      expect(dbMock.tasks.delete).not.toHaveBeenCalled();
    });

    it('should safely no-op if task does not exist', async () => {
      dbMock.tasks.get.mockResolvedValue(undefined);

      await service.deleteTask('missing');

      expect(dbMock.tasks.delete).not.toHaveBeenCalled();
    });
  });

  describe('completeTask', () => {
    it('should complete an uncompleted task, update timestamp, add balance, and return the earned reward', async () => {
      const task: DisciplineItem = {
        id: 't-1',
        title: 'Pay internet bill',
        type: DisciplineItemType.ONEOFF,
        rewardValue: 50,
        isCompleted: false,
        lastCompletedAt: null,
        createdAt: Date.now(),
      };
      dbMock.tasks.get.mockResolvedValue(task);

      const earned = await service.completeTask('t-1');

      expect(earned).toBe(50);
      expect(dbMock.tasks.update).toHaveBeenCalledWith(
        't-1',
        expect.objectContaining({
          isCompleted: true,
        }),
      );
      expect(userMock.addBalance).toHaveBeenCalledWith(50);
    });

    it('should return null and not credit balance if task is already completed', async () => {
      const task: DisciplineItem = {
        id: 't-1',
        title: 'Pay internet bill',
        type: DisciplineItemType.ONEOFF,
        rewardValue: 50,
        isCompleted: true,
        lastCompletedAt: Date.now(),
        createdAt: Date.now(),
      };
      dbMock.tasks.get.mockResolvedValue(task);

      const earned = await service.completeTask('t-1');

      expect(earned).toBeNull();
      expect(dbMock.tasks.update).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });

    it('should return null and do nothing if task is not found', async () => {
      dbMock.tasks.get.mockResolvedValue(undefined);

      const earned = await service.completeTask('non-existent-id');

      expect(earned).toBeNull();
      expect(dbMock.tasks.update).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });

    it('should credit the reward once when the task is completed twice at the same time', async () => {
      let stored: DisciplineItem = {
        id: 't-1',
        title: 'Pay internet bill',
        type: DisciplineItemType.ONEOFF,
        rewardValue: 50,
        isCompleted: false,
        lastCompletedAt: null,
        createdAt: Date.now(),
      };
      dbMock.tasks.get.mockImplementation(() => ({ ...stored }));
      dbMock.tasks.update.mockImplementation((_id: string, changes: Partial<DisciplineItem>) => {
        stored = { ...stored, ...changes };
        return 1;
      });

      const results = await Promise.all([service.completeTask('t-1'), service.completeTask('t-1')]);

      expect(results).toEqual([50, null]);
      expect(userMock.addBalance).toHaveBeenCalledTimes(1);
    });
  });

  describe('undoCompleteTask', () => {
    it('should revert a completed task to pending, clear lastCompletedAt, deduct balance, and return true', async () => {
      const task: DisciplineItem = {
        id: 't-1',
        title: 'Pay internet bill',
        type: DisciplineItemType.ONEOFF,
        rewardValue: 50,
        isCompleted: true,
        lastCompletedAt: 123456,
        createdAt: 100000,
      };
      dbMock.tasks.get.mockResolvedValue(task);

      const undone = await service.undoCompleteTask('t-1');

      expect(undone).toBe(true);
      expect(dbMock.tasks.update).toHaveBeenCalledWith('t-1', {
        isCompleted: false,
        lastCompletedAt: null,
      });
      expect(userMock.addBalance).toHaveBeenCalledWith(-50);
    });

    it('should return false and not deduct balance if task is already pending or not found', async () => {
      const pendingTask: DisciplineItem = {
        id: 't-1',
        title: 'Pay internet bill',
        type: DisciplineItemType.ONEOFF,
        rewardValue: 50,
        isCompleted: false,
        lastCompletedAt: null,
        createdAt: 100000,
      };
      dbMock.tasks.get.mockResolvedValueOnce(pendingTask);

      expect(await service.undoCompleteTask('t-1')).toBe(false);
      expect(dbMock.tasks.update).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();

      dbMock.tasks.get.mockResolvedValueOnce(undefined);
      expect(await service.undoCompleteTask('missing')).toBe(false);
      expect(dbMock.tasks.update).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });
  });
});
