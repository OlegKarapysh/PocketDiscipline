import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { User, DisciplineItem } from '../models/data-models';
import { Goal } from '../../features/goals/models/goal.model';

@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {
  users!: Table<User, number>;
  tasks!: Table<DisciplineItem, string>;
  goals!: Table<Goal, string>;

  constructor() {
    super('pocket-discipline-db');
    this.version(1).stores({
      users: 'id', // Primary key
      tasks: 'id, type, isCompleted', // Primary key and indexed props
      goals: 'id, status'
    });

    this.on('populate', () => {
      this.goals.bulkAdd([
        { id: crypto.randomUUID(), title: 'do 50 push-ups on fists', rewardValue: 2000, status: 'ACTIVE', completedAt: null, createdAt: Date.now() },
        { id: crypto.randomUUID(), title: 'do 100 squats', rewardValue: 1500, status: 'ACTIVE', completedAt: null, createdAt: Date.now() },
        { id: crypto.randomUUID(), title: 'do 12 pomodorro a day', rewardValue: 1500, status: 'ACTIVE', completedAt: null, createdAt: Date.now() }
      ]);
    });
  }
}
