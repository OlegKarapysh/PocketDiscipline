import { Injectable, inject } from '@angular/core';
import { DbService } from '../../../core/services/db.service';
import { UserService } from '../../../core/services/user.service';
import { Goal, GOAL_STATUS } from '../models/goal.model';
import { liveQuery } from 'dexie';

const ERROR_DUPLICATE_GOAL_TITLE = 'A goal with this title already exists.';
const TRANSACTION_READ_WRITE = 'rw';
const STATUS_FIELD = 'status';
const COMPLETED_AT_FIELD = 'completedAt';

@Injectable({
  providedIn: 'root',
})
export class GoalService {
  private db = inject(DbService);
  private userService = inject(UserService);

  getActiveGoals() {
    return liveQuery(() => this.db.goals.where(STATUS_FIELD).equals(GOAL_STATUS.ACTIVE).toArray());
  }

  getCompletedGoals() {
    return liveQuery(() => this.db.goals.where(STATUS_FIELD).equals(GOAL_STATUS.COMPLETED).reverse().sortBy(COMPLETED_AT_FIELD));
  }

  async completeGoal(id: string) {
    const goal = await this.db.goals.get(id);
    if (goal && goal.status === GOAL_STATUS.ACTIVE) {
      await this.db.transaction(TRANSACTION_READ_WRITE, this.db.goals, this.db.users, async () => {
        await this.db.goals.update(id, {
          status: GOAL_STATUS.COMPLETED,
          completedAt: Date.now(),
        });
        await this.userService.addBalance(goal.rewardValue);
      });
    }
  }

  async undoCompleteGoal(id: string) {
    const goal = await this.db.goals.get(id);
    if (goal && goal.status === GOAL_STATUS.COMPLETED) {
      await this.db.transaction(TRANSACTION_READ_WRITE, this.db.goals, this.db.users, async () => {
        await this.db.goals.update(id, {
          status: GOAL_STATUS.ACTIVE,
          completedAt: null,
        });
        await this.userService.addBalance(-goal.rewardValue);
      });
    }
  }

  async addGoal(title: string, rewardValue: number) {
    const existing = await this.db.goals.where(STATUS_FIELD).equals(GOAL_STATUS.ACTIVE).toArray();
    if (existing.some((g) => g.title.toLowerCase() === title.toLowerCase())) {
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

  async updateGoal(id: string, title: string, rewardValue: number) {
    const goal = await this.db.goals.get(id);
    if (!goal || goal.status !== GOAL_STATUS.ACTIVE) return;

    const existing = await this.db.goals.where(STATUS_FIELD).equals(GOAL_STATUS.ACTIVE).toArray();
    if (existing.some((g) => g.id !== id && g.title.toLowerCase() === title.toLowerCase())) {
      throw new Error(ERROR_DUPLICATE_GOAL_TITLE);
    }

    await this.db.goals.update(id, { title, rewardValue });
  }

  async deleteGoal(id: string) {
    await this.db.goals.delete(id);
  }
}
