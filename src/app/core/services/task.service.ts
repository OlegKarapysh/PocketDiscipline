import { Injectable, inject } from '@angular/core';
import { DbService } from './db.service';
import { DisciplineItem } from '../models/data-models';
import { UserService } from './user.service';
import { liveQuery } from 'dexie';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private db = inject(DbService);
  private userService = inject(UserService);

  readonly tasks$ = liveQuery(async () => {
    // Perform daily reset logic before returning tasks
    await this.performDailyReset();
    return await this.db.tasks.toArray();
  });

  async addTask(title: string, type: 'HABIT' | 'ONEOFF', rewardValue: number) {
    const task: DisciplineItem = {
      id: crypto.randomUUID(),
      title,
      type,
      rewardValue,
      isCompleted: false,
      lastCompletedAt: null,
      createdAt: Date.now()
    };
    await this.db.tasks.add(task);
  }

  async completeTask(id: string) {
    const task = await this.db.tasks.get(id);
    if (task && !task.isCompleted) {
      await this.db.transaction('rw', this.db.tasks, this.db.users, async () => {
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
    now.setHours(0, 0, 0, 0);
    const startOfDay = now.getTime();

    const tasks = await this.db.tasks.where('type').equals('HABIT').toArray();
    const toReset = tasks.filter(t => t.isCompleted && t.lastCompletedAt && t.lastCompletedAt < startOfDay);
    
    if (toReset.length > 0) {
      await this.db.transaction('rw', this.db.tasks, async () => {
        for (const t of toReset) {
          await this.db.tasks.update(t.id, { isCompleted: false });
        }
      });
    }
  }
}
