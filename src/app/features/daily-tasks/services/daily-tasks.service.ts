import { Service, inject } from '@angular/core';
import { DbService } from '../../../database/db.service';
import { UserService } from '../../../core/services/user.service';
import type { DailyTask } from '../../../core/models/daily-task.model';
import type { DailyTaskDifficulty } from '../../../core/models/daily-task-difficulty.model';
import { liveQuery } from 'dexie';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { DATE_LOCALE_CA } from '../../../core/constants/date-locale.const';

const ONE_DAY_MS = 86_400_000;
const MAX_STREAK_BONUS_DAYS = 10;
const STREAK_BONUS_RATE = 0.1;
const ERROR_TASK_NOT_FOUND = 'This daily task no longer exists.';

@Service()
export class DailyTasksService {
  private db = inject(DbService);
  private userService = inject(UserService);

  private getDiffDays(ts1: number, ts2: number): number {
    const d1 = new Date(ts1);
    d1.setHours(0, 0, 0, 0);
    const d2 = new Date(ts2);
    d2.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.round(diffTime / ONE_DAY_MS);
  }

  private readonly _tasks$: Observable<DailyTask[]> = from(
    liveQuery(async () => {
      const tasks = await this.db.dailyTasks.toArray();
      const now = Date.now();

      return tasks.map((task) => {
        let currentStreak = task.streak;
        if (task.lastCompletedAt) {
          const diffDays = this.getDiffDays(now, task.lastCompletedAt);
          if (diffDays > 1 && currentStreak > 0) {
            currentStreak = 0;
          }
        }
        return {
          ...task,
          streak: currentStreak,
        };
      });
    }),
  );

  get tasks$(): Observable<DailyTask[]> {
    return this._tasks$;
  }

  async resetBrokenStreaks(): Promise<void> {
    const tasks = await this.db.dailyTasks.toArray();
    const now = Date.now();
    const staleTasks = tasks.filter(
      (task) => task.lastCompletedAt && this.getDiffDays(now, task.lastCompletedAt) > 1 && task.streak > 0,
    );

    if (staleTasks.length > 0) {
      await this.db.transaction('rw', this.db.dailyTasks, async () => {
        for (const task of staleTasks) {
          await this.db.dailyTasks.update(task.id, { streak: 0 });
        }
      });
    }
  }

  async createTask(title: string, difficulties: DailyTaskDifficulty[]): Promise<void> {
    this.assertValidRewards(difficulties);
    const newTask: DailyTask = {
      id: crypto.randomUUID(),
      title,
      difficulties,
      createdAt: Date.now(),
      streak: 0,
      lastCompletedAt: null,
    };
    await this.db.dailyTasks.add(newTask);
  }

  // Keeps the streak and lastCompletedAt. Past completions keep the reward they earned: a changed
  // reward applies from the next completion on.
  async updateTask(id: string, title: string, difficulties: DailyTaskDifficulty[]): Promise<void> {
    this.assertValidRewards(difficulties);
    await this.db.transaction('rw', this.db.dailyTasks, async () => {
      if (!(await this.db.dailyTasks.get(id))) {
        throw new Error(ERROR_TASK_NOT_FOUND);
      }
      await this.db.dailyTasks.update(id, { title, difficulties });
    });
  }

  // Keeps the task's completions, so its earnings history and the balance stay as they are.
  async deleteTask(id: string): Promise<void> {
    await this.db.dailyTasks.delete(id);
  }

  private assertValidRewards(difficulties: DailyTaskDifficulty[]): void {
    const invalid = difficulties.find((d) => !Number.isSafeInteger(d.baseReward) || d.baseReward < 1);
    if (invalid) {
      throw new Error(`The reward for "${invalid.name}" must be a whole number of hryvnias, at least 1.`);
    }
  }

  async completeTask(task: DailyTask, difficulty: DailyTaskDifficulty): Promise<void> {
    // Rows saved before rewards were validated can hold a reward of zero or less; editing the task fixes it.
    if (!Number.isFinite(difficulty.baseReward) || difficulty.baseReward <= 0) {
      throw new Error(`"${difficulty.name}" has no valid reward. Edit the task to set one above zero.`);
    }

    const now = Date.now();
    const todayStr = new Date(now).toLocaleDateString(DATE_LOCALE_CA);

    await this.db.transaction('rw', this.db.dailyTasks, this.db.users, this.db.dailyTaskCompletions, async () => {
      const freshTask = (await this.db.dailyTasks.get(task.id)) ?? task;

      const diffDays = freshTask.lastCompletedAt === null ? null : this.getDiffDays(now, freshTask.lastCompletedAt);
      if (diffDays === 0) return;

      const newStreak = diffDays === 1 ? freshTask.streak + 1 : 1;

      const streakCountForBonus = Math.max(newStreak - 1, 0);
      const cappedStreakBonus = Math.min(streakCountForBonus, MAX_STREAK_BONUS_DAYS);
      const bonusMultiplier = 1 + cappedStreakBonus * STREAK_BONUS_RATE;
      const finalReward = Math.round(difficulty.baseReward * bonusMultiplier);

      await this.db.dailyTasks.update(freshTask.id, {
        lastCompletedAt: now,
        streak: newStreak,
      });

      await this.db.dailyTaskCompletions.add({
        id: crypto.randomUUID(),
        taskId: freshTask.id,
        date: todayStr,
        difficultyId: difficulty.id,
        rewardEarned: finalReward,
        completedAt: now,
      });

      await this.userService.addBalance(finalReward);
    });
  }
}
