import { Service, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { DbService } from '../../../database/db.service';
import type { DisciplineItem } from '../../../core/models/discipline-item.model';
import { DisciplineItemType } from '../../../core/models/discipline-item-type.enum';
import { UserService } from '../../../core/services/user.service';
import { TITLE_MAX_LENGTH } from '../../../shared/constants/text-length.const';
import { MAX_MONEY_AMOUNT } from '../../../shared/validators/money-amount';

const ERROR_TASK_NOT_FOUND = 'This one-off task no longer exists.';

@Service()
export class TaskService {
  private readonly db = inject(DbService);
  private readonly userService = inject(UserService);

  readonly tasks$: Observable<DisciplineItem[]> = from(
    liveQuery(async () => {
      const tasks = await this.db.tasks.toArray();
      return tasks.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1;
        }
        if (!a.isCompleted) {
          return b.createdAt - a.createdAt || a.title.localeCompare(b.title);
        }
        return (b.lastCompletedAt ?? 0) - (a.lastCompletedAt ?? 0) || b.createdAt - a.createdAt;
      });
    }),
  );

  async addTask(rawTitle: string, rewardValue: number): Promise<void> {
    const title = this.assertValidTitle(rawTitle);
    this.assertValidReward(rewardValue);

    const item: DisciplineItem = {
      id: crypto.randomUUID(),
      title,
      type: DisciplineItemType.ONEOFF,
      rewardValue,
      isCompleted: false,
      lastCompletedAt: null,
      createdAt: Date.now(),
    };
    await this.db.tasks.add(item);
  }

  async updateTask(id: string, rawTitle: string, rewardValue: number): Promise<void> {
    const title = this.assertValidTitle(rawTitle);
    this.assertValidReward(rewardValue);

    await this.db.transaction('rw', this.db.tasks, async () => {
      const task = await this.db.tasks.get(id);
      if (!task) {
        throw new Error(ERROR_TASK_NOT_FOUND);
      }
      if (task.isCompleted) {
        throw new Error('Completed tasks cannot be edited.');
      }
      await this.db.tasks.update(id, { title, rewardValue });
    });
  }

  async deleteTask(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.tasks, async () => {
      const task = await this.db.tasks.get(id);
      if (!task) return;
      if (task.isCompleted) {
        throw new Error('Completed tasks cannot be deleted.');
      }
      await this.db.tasks.delete(id);
    });
  }

  async completeTask(id: string): Promise<number | null> {
    return this.db.transaction('rw', this.db.tasks, this.db.users, async () => {
      const task = await this.db.tasks.get(id);
      if (!task || task.isCompleted) return null;

      await this.db.tasks.update(id, {
        isCompleted: true,
        lastCompletedAt: Date.now(),
      });
      await this.userService.addBalance(task.rewardValue);
      return task.rewardValue;
    });
  }

  async undoCompleteTask(id: string): Promise<boolean> {
    return this.db.transaction('rw', this.db.tasks, this.db.users, async () => {
      const task = await this.db.tasks.get(id);
      if (!task?.isCompleted) return false;

      await this.db.tasks.update(id, {
        isCompleted: false,
        lastCompletedAt: null,
      });
      await this.userService.addBalance(-task.rewardValue);
      return true;
    });
  }

  private assertValidTitle(rawTitle: string): string {
    const title = rawTitle.trim();
    if (!title) {
      throw new Error('Task title is required.');
    }
    if (title.length > TITLE_MAX_LENGTH) {
      throw new Error(`Task title cannot exceed ${TITLE_MAX_LENGTH} characters.`);
    }
    return title;
  }

  private assertValidReward(rewardValue: number): void {
    if (!Number.isSafeInteger(rewardValue) || rewardValue < 1) {
      throw new Error('Task reward must be a whole number of hryvnias, at least 1.');
    }
    if (rewardValue > MAX_MONEY_AMOUNT) {
      throw new Error(`Task reward cannot exceed ${MAX_MONEY_AMOUNT} ₴.`);
    }
  }
}
