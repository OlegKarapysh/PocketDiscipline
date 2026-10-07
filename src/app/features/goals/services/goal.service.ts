import { Service, inject } from '@angular/core';
import { DbService } from '../../../database/db.service';
import { UserService } from '../../../core/services/user.service';
import type { Goal } from '../../../core/models/goal.model';
import { GOAL_STATUS } from '../../../core/models/goal.model';
import { liveQuery } from 'dexie';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';

const ERROR_DUPLICATE_GOAL_TITLE = 'A goal with this title already exists.';
const ERROR_UNDO_DUPLICATE_GOAL_TITLE = 'Cannot undo: an active goal already has this title.';
@Service()
export class GoalService {
  private db = inject(DbService);
  private userService = inject(UserService);

  getActiveGoals(): Observable<Goal[]> {
    return from(
      liveQuery(async () => {
        const goals = await this.db.goals.where('status').equals(GOAL_STATUS.ACTIVE).toArray();
        // Newest first. `createdAt` is not indexed, and goals created in the same millisecond tie,
        // so the title (unique among active goals) keeps the order stable.
        return goals.sort((a, b) => b.createdAt - a.createdAt || a.title.localeCompare(b.title));
      }),
    );
  }

  getCompletedGoals(): Observable<Goal[]> {
    return from(
      liveQuery(() => this.db.goals.where('status').equals(GOAL_STATUS.COMPLETED).reverse().sortBy('completedAt')),
    );
  }

  async completeGoal(id: string): Promise<boolean> {
    return this.db.transaction('rw', this.db.goals, this.db.users, async () => {
      const goal = await this.db.goals.get(id);
      if (goal?.status !== GOAL_STATUS.ACTIVE) return false;

      await this.db.goals.update(id, {
        status: GOAL_STATUS.COMPLETED,
        completedAt: Date.now(),
      });
      await this.userService.addBalance(goal.rewardValue);
      return true;
    });
  }

  async undoCompleteGoal(id: string): Promise<boolean> {
    return this.db.transaction('rw', this.db.goals, this.db.users, async () => {
      const goal = await this.db.goals.get(id);
      if (goal?.status !== GOAL_STATUS.COMPLETED) return false;
      if (await this.isTitleActive(goal.title)) {
        throw new Error(ERROR_UNDO_DUPLICATE_GOAL_TITLE);
      }

      await this.db.goals.update(id, {
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
      });
      await this.userService.addBalance(-goal.rewardValue);
      return true;
    });
  }

  async addGoal(rawTitle: string, rewardValue: number): Promise<void> {
    this.assertValidReward(rewardValue);
    const title = rawTitle.trim();
    if (await this.isTitleActive(title)) {
      throw new Error(ERROR_DUPLICATE_GOAL_TITLE);
    }

    const goal: Goal = {
      id: crypto.randomUUID(),
      title,
      rewardValue,
      status: GOAL_STATUS.ACTIVE,
      completedAt: null,
      createdAt: Date.now(),
    };
    await this.db.goals.add(goal);
  }

  async updateGoal(id: string, rawTitle: string, rewardValue: number): Promise<void> {
    this.assertValidReward(rewardValue);
    const title = rawTitle.trim();
    const goal = await this.db.goals.get(id);
    if (goal?.status !== GOAL_STATUS.ACTIVE) return;

    if (await this.isTitleActive(title, id)) {
      throw new Error(ERROR_DUPLICATE_GOAL_TITLE);
    }

    await this.db.goals.update(id, { title, rewardValue });
  }

  async deleteGoal(id: string): Promise<void> {
    await this.db.goals.delete(id);
  }

  private assertValidReward(rewardValue: number): void {
    if (!Number.isSafeInteger(rewardValue) || rewardValue < 1) {
      throw new Error('Goal reward must be a whole number of hryvnias, at least 1.');
    }
  }

  private async isTitleActive(title: string, exceptId?: string): Promise<boolean> {
    const active = await this.db.goals.where('status').equals(GOAL_STATUS.ACTIVE).toArray();
    return active.some((g) => g.id !== exceptId && g.title.trim().toLowerCase() === title.trim().toLowerCase());
  }
}
