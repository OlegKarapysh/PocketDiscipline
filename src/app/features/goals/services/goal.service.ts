import { Injectable, inject } from '@angular/core';
import { DbService } from '../../../core/services/db.service';
import { UserService } from '../../../core/services/user.service';
import { Goal } from '../models/goal.model';
import { liveQuery } from 'dexie';

@Injectable({
  providedIn: 'root',
})
export class GoalService {
  private db = inject(DbService);
  private userService = inject(UserService);

  getActiveGoals() {
    return liveQuery(() => this.db.goals.where('status').equals('ACTIVE').toArray());
  }

  getCompletedGoals() {
    return liveQuery(() => this.db.goals.where('status').equals('COMPLETED').reverse().sortBy('completedAt'));
  }

  async completeGoal(id: string) {
    const goal = await this.db.goals.get(id);
    if (goal && goal.status === 'ACTIVE') {
      await this.db.transaction('rw', this.db.goals, this.db.users, async () => {
        await this.db.goals.update(id, {
          status: 'COMPLETED',
          completedAt: Date.now(),
        });
        await this.userService.addBalance(goal.rewardValue);
      });
    }
  }

  async undoCompleteGoal(id: string) {
    const goal = await this.db.goals.get(id);
    if (goal && goal.status === 'COMPLETED') {
      await this.db.transaction('rw', this.db.goals, this.db.users, async () => {
        await this.db.goals.update(id, {
          status: 'ACTIVE',
          completedAt: null,
        });
        await this.userService.addBalance(-goal.rewardValue);
      });
    }
  }

  async addGoal(title: string, rewardValue: number) {
    const existing = await this.db.goals.where('status').equals('ACTIVE').toArray();
    if (existing.some((g) => g.title.toLowerCase() === title.toLowerCase())) {
      throw new Error('A goal with this title already exists.');
    }

    const goal: Goal = {
      id: crypto.randomUUID(),
      title,
      rewardValue,
      status: 'ACTIVE',
      completedAt: null,
      createdAt: Date.now(),
    };
    await this.db.goals.add(goal);
  }

  async updateGoal(id: string, title: string, rewardValue: number) {
    const goal = await this.db.goals.get(id);
    if (!goal || goal.status !== 'ACTIVE') return;

    const existing = await this.db.goals.where('status').equals('ACTIVE').toArray();
    if (existing.some((g) => g.id !== id && g.title.toLowerCase() === title.toLowerCase())) {
      throw new Error('A goal with this title already exists.');
    }

    await this.db.goals.update(id, { title, rewardValue });
  }

  async deleteGoal(id: string) {
    await this.db.goals.delete(id);
  }
}
