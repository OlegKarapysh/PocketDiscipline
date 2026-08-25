import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { User, DisciplineItem } from '../models/data-models';
import { Goal } from '../../features/goals/models/goal.model';
import { DailyTask } from '../../features/daily-tasks/models/daily-task.model';

@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {
  users!: Table<User, number>;
  tasks!: Table<DisciplineItem, string>;
  goals!: Table<Goal, string>;
  dailyTasks!: Table<DailyTask, string>;

  constructor() {
    super('pocket-discipline-db');
    
    this.version(1).stores({
      users: 'id', // Primary key
      tasks: 'id, type, isCompleted' // Primary key and indexed props
    });

    this.version(2).stores({
      goals: 'id, status'
    }).upgrade(async (tx) => {
      const goalsCount = await tx.table('goals').count();
      if (goalsCount === 0) {
        await tx.table('goals').bulkAdd(this.getInitialGoals());
      }
    });

    this.version(3).stores({
      dailyTasks: 'id'
    });

    this.on('populate', () => {
      this.users.add({ id: 1, name: 'User', balance: 0, createdAt: Date.now(), updatedAt: Date.now() });
      this.goals.bulkAdd(this.getInitialGoals());
    });

    this.on('ready', async () => {
      const user = await this.users.get(1);
      if (!user) {
        await this.users.add({ id: 1, name: 'User', balance: 0, createdAt: Date.now(), updatedAt: Date.now() });
      }
    });
  }

  private getInitialGoals(): Goal[] {
    return [
      { id: crypto.randomUUID(), title: 'do 50 push-ups on fists', rewardValue: 2000, status: 'ACTIVE', completedAt: null, createdAt: Date.now() },
      { id: crypto.randomUUID(), title: 'do 100 squats', rewardValue: 1500, status: 'ACTIVE', completedAt: null, createdAt: Date.now() },
      { id: crypto.randomUUID(), title: 'do 12 pomodorro a day', rewardValue: 1500, status: 'ACTIVE', completedAt: null, createdAt: Date.now() }
    ];
  }
}
