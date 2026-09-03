import { Service, inject } from '@angular/core';
import { DbService } from './db.service';
import { DisciplineItem } from '../models/discipline-item.model';
import { DisciplineItemType } from '../models/discipline-item-type.enum';
import { UserService } from './user.service';
import { liveQuery } from 'dexie';

const MIDNIGHT_HOUR = 0;
const MIDNIGHT_MINUTE = 0;
const MIDNIGHT_SECOND = 0;
const MIDNIGHT_MILLISECOND = 0;
const TRANSACTION_READ_WRITE = 'rw';
const FIELD_TYPE = 'type';

@Service()
export class TaskService {
  private db = inject(DbService);
  private userService = inject(UserService);

  readonly tasks$ = liveQuery(async () => {
    await this.performDailyReset();
    return await this.db.tasks.toArray();
  });

  async addTask(title: string, type: DisciplineItemType, rewardValue: number) {
    const item: DisciplineItem = {
      id: crypto.randomUUID(),
      title,
      type,
      rewardValue,
      isCompleted: false,
      lastCompletedAt: null,
      createdAt: Date.now()
    };
    await this.db.tasks.add(item);
  }

  async completeTask(id: string) {
    const task = await this.db.tasks.get(id);
    if (task && !task.isCompleted) {
      await this.db.transaction(TRANSACTION_READ_WRITE, this.db.tasks, this.db.users, async () => {
        await this.db.tasks.update(id, {
          isCompleted: true,
          lastCompletedAt: Date.now()
        });
        await this.userService.addBalance(task.rewardValue);
      });
    }
  }

  async performDailyReset() {
    const now = new Date();
    now.setHours(MIDNIGHT_HOUR, MIDNIGHT_MINUTE, MIDNIGHT_SECOND, MIDNIGHT_MILLISECOND);
    const startOfDay = now.getTime();

    const tasks = await this.db.tasks.where(FIELD_TYPE).equals(DisciplineItemType.HABIT).toArray();
    const toReset = tasks.filter(t => t.isCompleted && t.lastCompletedAt && t.lastCompletedAt < startOfDay);

    if (toReset.length > 0) {
      await this.db.transaction(TRANSACTION_READ_WRITE, this.db.tasks, async () => {
        for (const t of toReset) {
          await this.db.tasks.update(t.id, { isCompleted: false });
        }
      });
    }
  }
}
