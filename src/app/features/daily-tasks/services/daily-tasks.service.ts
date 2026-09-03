import { Injectable, inject } from '@angular/core';
import { DbService } from '../../../core/services/db.service';
import { UserService } from '../../../core/services/user.service';
import { DailyTask } from '../models/daily-task.model';
import { DailyTaskDifficulty } from '../models/daily-task-difficulty.model';
import { liveQuery } from 'dexie';
import { Observable, from } from 'rxjs';

const MILLISECONDS_IN_DAY = 86_400_000;
const INITIAL_STREAK = 0;
const FIRST_STREAK = 1;
const STREAK_INCREMENT = 1;
const DAYS_THRESHOLD_CONSECUTIVE = 1;
const MAX_STREAK_BONUS_DAYS = 10;
const STREAK_BONUS_RATE = 0.10;
const BASE_BONUS_MULTIPLIER = 1;
const TRANSACTION_READ_WRITE = 'rw';
const MIDNIGHT_HOUR = 0;
const MIDNIGHT_MINUTE = 0;
const MIDNIGHT_SECOND = 0;
const MIDNIGHT_MILLISECOND = 0;
const DATE_LOCALE_CA = 'en-CA';
const MIN_BASE_REWARD = 0;

@Injectable({
  providedIn: 'root'
})
export class DailyTasksService {
  private db = inject(DbService);
  private userService = inject(UserService);

  private getDiffDays(ts1: number, ts2: number): number {
    const d1 = new Date(ts1);
    d1.setHours(MIDNIGHT_HOUR, MIDNIGHT_MINUTE, MIDNIGHT_SECOND, MIDNIGHT_MILLISECOND);
    const d2 = new Date(ts2);
    d2.setHours(MIDNIGHT_HOUR, MIDNIGHT_MINUTE, MIDNIGHT_SECOND, MIDNIGHT_MILLISECOND);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.round(diffTime / MILLISECONDS_IN_DAY);
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
          if (diffDays > DAYS_THRESHOLD_CONSECUTIVE && currentStreak > INITIAL_STREAK) {
            currentStreak = INITIAL_STREAK;
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
      streak: INITIAL_STREAK,
      lastCompletedAt: null
    };
    await this.db.dailyTasks.add(newTask);
  }

  async completeTask(task: DailyTask, difficulty: DailyTaskDifficulty) {
    if (!difficulty || !Number.isFinite(difficulty.baseReward) || difficulty.baseReward <= MIN_BASE_REWARD) {
      return;
    }

    const now = Date.now();
    const todayStr = new Date(now).toLocaleDateString(DATE_LOCALE_CA);

    await this.db.transaction(
      TRANSACTION_READ_WRITE,
      this.db.dailyTasks,
      this.db.users,
      this.db.dailyTaskCompletions,
      async () => {
        const freshTask = (await this.db.dailyTasks?.get?.(task.id)) ?? task;

        let newStreak = freshTask.streak;
        if (freshTask.lastCompletedAt) {
          const diffDays = this.getDiffDays(now, freshTask.lastCompletedAt);
          if (diffDays === DAYS_THRESHOLD_CONSECUTIVE) {
            newStreak += STREAK_INCREMENT;
          } else if (diffDays > DAYS_THRESHOLD_CONSECUTIVE) {
            newStreak = FIRST_STREAK;
          }
        } else {
          newStreak = FIRST_STREAK;
        }

        const streakCountForBonus = Math.max(newStreak - FIRST_STREAK, INITIAL_STREAK);
        const cappedStreakBonus = Math.min(streakCountForBonus, MAX_STREAK_BONUS_DAYS);
        const bonusMultiplier = BASE_BONUS_MULTIPLIER + cappedStreakBonus * STREAK_BONUS_RATE;
        const finalReward = Math.round(difficulty.baseReward * bonusMultiplier);

        await this.db.dailyTasks.update(freshTask.id, {
          lastCompletedAt: now,
          streak: newStreak
        });

        await this.db.dailyTaskCompletions.add({
          id: crypto.randomUUID(),
          taskId: freshTask.id,
          date: todayStr,
          difficultyId: difficulty.id,
          rewardEarned: finalReward,
          completedAt: now
        });

        await this.userService.addBalance(finalReward);
      }
    );
  }
}
