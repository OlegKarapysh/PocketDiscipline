import { Injectable, inject } from '@angular/core';
import { DbService } from '../../../core/services/db.service';
import { UserService } from '../../../core/services/user.service';
import { DailyTask, DailyTaskDifficulty } from '../models/daily-task.model';
import { liveQuery } from 'dexie';
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DailyTasksService {
  private db = inject(DbService);
  private userService = inject(UserService);

  private getDiffDays(ts1: number, ts2: number): number {
    const d1 = new Date(ts1);
    d1.setHours(0, 0, 0, 0);
    const d2 = new Date(ts2);
    d2.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  get tasks$(): Observable<DailyTask[]> {
    return from(liveQuery(async () => {
      const tasks = await this.db.dailyTasks.toArray();
      const now = Date.now();
      
      const updatedTasks = [];
      for (const task of tasks) {
        let currentStreak = task.streak;
        let needsUpdate = false;
        
        if (task.lastCompletedAt) {
          const diffDays = this.getDiffDays(now, task.lastCompletedAt);
          if (diffDays > 1 && currentStreak > 0) {
            currentStreak = 0;
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          await this.db.dailyTasks.update(task.id, { streak: currentStreak });
          task.streak = currentStreak;
        }
        updatedTasks.push(task);
      }
      return updatedTasks;
    })) as Observable<DailyTask[]>;
  }

  async createTask(title: string, difficulties: DailyTaskDifficulty[]) {
    const newTask: DailyTask = {
      id: crypto.randomUUID(),
      title,
      difficulties,
      createdAt: Date.now(),
      streak: 0,
      lastCompletedAt: null
    };
    await this.db.dailyTasks.add(newTask);
  }

  async completeTask(task: DailyTask, difficulty: DailyTaskDifficulty) {
    const now = Date.now();
    let newStreak = task.streak;
    
    if (task.lastCompletedAt) {
      const diffDays = this.getDiffDays(now, task.lastCompletedAt);
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const bonusMultiplier = 1 + Math.min(Math.max(newStreak - 1, 0), 10) * 0.10;
    const finalReward = Math.round(difficulty.baseReward * bonusMultiplier);

    await this.db.transaction('rw', this.db.dailyTasks, this.db.users, async () => {
      await this.db.dailyTasks.update(task.id, {
        lastCompletedAt: now,
        streak: newStreak
      });

      await this.userService.addBalance(finalReward);
    });
  }
}
