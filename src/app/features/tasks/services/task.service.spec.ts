import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { TaskService } from './task.service';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import type { DisciplineItem } from '../../../core/models/discipline-item.model';
import { DisciplineItemType } from '../../../core/models/discipline-item-type.enum';
import { CURRENT_USER_ID } from '../../../core/models/user.model';
import { TITLE_MAX_LENGTH } from '../../../shared/constants/text-length.const';
import { MAX_MONEY_AMOUNT } from '../../../shared/validators/money-amount';

describe('TaskService', () => {
  let service: TaskService;
  let db: DbService;

  const pendingTask: DisciplineItem = {
    id: 't-1',
    title: 'Pay internet bill',
    type: DisciplineItemType.ONEOFF,
    rewardValue: 50,
    isCompleted: false,
    lastCompletedAt: null,
    createdAt: 1000,
  };
  const completedTask: DisciplineItem = { ...pendingTask, isCompleted: true, lastCompletedAt: 2000 };

  const balance = async () => (await db.users.get(CURRENT_USER_ID))?.balance;

  beforeEach(async () => {
    db = await openEmptyDb();
    await db.users.add({ id: CURRENT_USER_ID, name: 'Current', balance: 1000, createdAt: 0, updatedAt: 0 });
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
      await db.tasks.bulkAdd(storedTasks);

      const tasks = await firstValueFrom(service.tasks$);

      expect(tasks.map((t) => t.id)).toEqual([
        'pending-tie-a',
        'pending-tie-b',
        'pending-older',
        'done-newer',
        'done-older',
      ]);
      expect(await db.tasks.toArray()).toEqual(expect.arrayContaining(storedTasks));
      expect(await balance()).toBe(1000);
    });
  });

  describe('addTask', () => {
    it('should trim the title and add a ONEOFF task to the database', async () => {
      await service.addTask('  Pay internet bill  ', 50);

      expect(await db.tasks.toArray()).toEqual([
        expect.objectContaining({
          title: 'Pay internet bill',
          type: DisciplineItemType.ONEOFF,
          rewardValue: 50,
          isCompleted: false,
          lastCompletedAt: null,
        }),
      ]);
    });

    it('should reject an empty or whitespace-only title', async () => {
      await expect(service.addTask('   ', 50)).rejects.toThrow('Task title is required.');
      expect(await db.tasks.count()).toBe(0);
    });

    it('should reject a title exceeding TITLE_MAX_LENGTH', async () => {
      const longTitle = 'A'.repeat(TITLE_MAX_LENGTH + 1);
      await expect(service.addTask(longTitle, 50)).rejects.toThrow(
        `Task title cannot exceed ${TITLE_MAX_LENGTH} characters.`,
      );
      expect(await db.tasks.count()).toBe(0);
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
      expect(await db.tasks.count()).toBe(0);
    });
  });

  describe('updateTask', () => {
    it('should update title and rewardValue for a pending task', async () => {
      await db.tasks.add(pendingTask);

      await service.updateTask('t-1', '  File quarterly taxes  ', 200);

      expect(await db.tasks.get('t-1')).toEqual({ ...pendingTask, title: 'File quarterly taxes', rewardValue: 200 });
      expect(await balance()).toBe(1000);
    });

    it('should throw when the task does not exist', async () => {
      await expect(service.updateTask('missing', 'Updated title', 100)).rejects.toThrow(
        'This one-off task no longer exists.',
      );
      expect(await db.tasks.count()).toBe(0);
    });

    it('should reject updating a completed task', async () => {
      await db.tasks.add(completedTask);

      await expect(service.updateTask('t-1', 'Updated title', 100)).rejects.toThrow(
        'Completed tasks cannot be edited.',
      );
      expect(await db.tasks.get('t-1')).toEqual(completedTask);
    });

    it('should validate title and reward before updating', async () => {
      await db.tasks.add(pendingTask);

      await expect(service.updateTask('t-1', '   ', 100)).rejects.toThrow('Task title is required.');
      await expect(service.updateTask('t-1', 'Valid', 0)).rejects.toThrow(
        'Task reward must be a whole number of hryvnias, at least 1.',
      );
      expect(await db.tasks.get('t-1')).toEqual(pendingTask);
    });
  });

  describe('deleteTask', () => {
    it('should delete a pending task and leave user balance untouched', async () => {
      await db.tasks.add(pendingTask);

      await service.deleteTask('t-1');

      expect(await db.tasks.get('t-1')).toBeUndefined();
      expect(await balance()).toBe(1000);
    });

    it('should reject deleting a completed task', async () => {
      await db.tasks.add(completedTask);

      await expect(service.deleteTask('t-1')).rejects.toThrow('Completed tasks cannot be deleted.');
      expect(await db.tasks.get('t-1')).toEqual(completedTask);
    });

    it('should safely no-op if task does not exist', async () => {
      await db.tasks.add(pendingTask);

      await service.deleteTask('missing');

      expect(await db.tasks.get('t-1')).toEqual(pendingTask);
    });
  });

  describe('completeTask', () => {
    it('should complete an uncompleted task, update timestamp, add balance, and return the earned reward', async () => {
      await db.tasks.add(pendingTask);

      const earned = await service.completeTask('t-1');

      expect(earned).toBe(50);
      expect(await db.tasks.get('t-1')).toEqual(
        expect.objectContaining({ isCompleted: true, lastCompletedAt: expect.any(Number) as number }),
      );
      expect(await balance()).toBe(1050);
    });

    it('should return null and not credit balance if task is already completed', async () => {
      await db.tasks.add(completedTask);

      const earned = await service.completeTask('t-1');

      expect(earned).toBeNull();
      expect(await db.tasks.get('t-1')).toEqual(completedTask);
      expect(await balance()).toBe(1000);
    });

    it('should return null and do nothing if task is not found', async () => {
      const earned = await service.completeTask('non-existent-id');

      expect(earned).toBeNull();
      expect(await db.tasks.count()).toBe(0);
      expect(await balance()).toBe(1000);
    });

    it('should credit the reward once when the task is completed twice at the same time', async () => {
      await db.tasks.add(pendingTask);

      const results = await Promise.all([service.completeTask('t-1'), service.completeTask('t-1')]);

      expect(results).toEqual([50, null]);
      expect(await balance()).toBe(1050);
    });
  });

  describe('undoCompleteTask', () => {
    it('should revert a completed task to pending, clear lastCompletedAt, deduct balance, and return true', async () => {
      await db.tasks.add(completedTask);

      const undone = await service.undoCompleteTask('t-1');

      expect(undone).toBe(true);
      expect(await db.tasks.get('t-1')).toEqual(pendingTask);
      expect(await balance()).toBe(950);
    });

    it('should return false and not deduct balance if task is already pending or not found', async () => {
      await db.tasks.add(pendingTask);

      expect(await service.undoCompleteTask('t-1')).toBe(false);
      expect(await db.tasks.get('t-1')).toEqual(pendingTask);
      expect(await balance()).toBe(1000);

      expect(await service.undoCompleteTask('missing')).toBe(false);
      expect(await balance()).toBe(1000);
    });
  });
});
