import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { User } from '../models/user.model';
import { DisciplineItem } from '../models/discipline-item.model';
import { Goal, GOAL_STATUS } from '../../features/goals/models/goal.model';
import { DailyTask } from '../../features/daily-tasks/models/daily-task.model';
import { DailyScore } from '../../features/daily-scores/models/daily-score.model';
import { PomodoroSession } from '../../features/pomodoro/models/pomodoro-session.model';
import { CURRENT_USER_ID, CURRENT_USER_NAME, DEFAULT_INITIAL_BALANCE } from './user.service';

const DATABASE_NAME = 'pocket-discipline-db';
const GOALS_TABLE_NAME = 'goals';
const LEGACY_POMODORO_DB_NAME = 'PomodoroDatabase';
const LEGACY_POMODORO_TABLE_NAME = 'sessions';

const SCHEMA_USERS = 'id';
const SCHEMA_TASKS = 'id, type, isCompleted';
const SCHEMA_GOALS = 'id, status';
const SCHEMA_DAILY_TASKS = 'id';
const SCHEMA_DAILY_SCORES = 'date';
const SCHEMA_POMODORO_SESSIONS = 'id, startTime, status';

const INITIAL_GOAL_PUSHUPS = {
  title: 'do 50 push-ups on fists',
  rewardValue: 2000,
};
const INITIAL_GOAL_SQUATS = {
  title: 'do 100 squats',
  rewardValue: 1500,
};
const INITIAL_GOAL_POMODORO = {
  title: 'do 12 pomodoro a day',
  rewardValue: 1500,
};

@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {
  users!: Table<User, number>;
  tasks!: Table<DisciplineItem, string>;
  goals!: Table<Goal, string>;
  dailyTasks!: Table<DailyTask, string>;
  dailyScores!: Table<DailyScore, string>;
  pomodoroSessions!: Table<PomodoroSession, string>;

  constructor() {
    super(DATABASE_NAME);

    this.version(1).stores({
      users: SCHEMA_USERS,
      tasks: SCHEMA_TASKS
    });

    this.version(2).stores({
      goals: SCHEMA_GOALS
    }).upgrade(async (tx) => {
      const goalsCount = await tx.table(GOALS_TABLE_NAME).count();
      if (goalsCount === 0) {
        await tx.table(GOALS_TABLE_NAME).bulkAdd(this.getInitialGoals());
      }
    });

    this.version(3).stores({
      dailyTasks: SCHEMA_DAILY_TASKS
    });

    this.version(4).stores({
      dailyScores: SCHEMA_DAILY_SCORES
    });

    this.version(5).stores({
      pomodoroSessions: SCHEMA_POMODORO_SESSIONS
    });

    this.on('populate', () => {
      this.users.add({
        id: CURRENT_USER_ID,
        name: CURRENT_USER_NAME,
        balance: DEFAULT_INITIAL_BALANCE,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      this.goals.bulkAdd(this.getInitialGoals());
    });

    this.on('ready', async () => {
      const user = await this.users.get(CURRENT_USER_ID);
      if (!user) {
        await this.users.add({
          id: CURRENT_USER_ID,
          name: CURRENT_USER_NAME,
          balance: DEFAULT_INITIAL_BALANCE,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      await this.migrateLegacyPomodoroDatabase();
    });
  }

  private async migrateLegacyPomodoroDatabase(): Promise<void> {
    try {
      const exists = await Dexie.exists(LEGACY_POMODORO_DB_NAME);
      if (exists) {
        const oldDb = new Dexie(LEGACY_POMODORO_DB_NAME);
        await oldDb.open();
        if (oldDb.tables.some(t => t.name === LEGACY_POMODORO_TABLE_NAME)) {
          const oldSessions = await oldDb.table<PomodoroSession, string>(LEGACY_POMODORO_TABLE_NAME).toArray();
          if (oldSessions.length > 0) {
            const currentCount = await this.pomodoroSessions.count();
            if (currentCount === 0) {
              await this.pomodoroSessions.bulkPut(oldSessions);
            }
          }
        }
        oldDb.close();
        await Dexie.delete(LEGACY_POMODORO_DB_NAME);
      }
    } catch {
      // Gracefully handle environments without legacy DB or where deletion is not permitted
    }
  }

  private getInitialGoals(): Goal[] {
    return [
      {
        id: crypto.randomUUID(),
        title: INITIAL_GOAL_PUSHUPS.title,
        rewardValue: INITIAL_GOAL_PUSHUPS.rewardValue,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now()
      },
      {
        id: crypto.randomUUID(),
        title: INITIAL_GOAL_SQUATS.title,
        rewardValue: INITIAL_GOAL_SQUATS.rewardValue,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now()
      },
      {
        id: crypto.randomUUID(),
        title: INITIAL_GOAL_POMODORO.title,
        rewardValue: INITIAL_GOAL_POMODORO.rewardValue,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now()
      }
    ];
  }
}
