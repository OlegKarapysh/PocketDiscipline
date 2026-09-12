import { Service } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { User, CURRENT_USER_ID, CURRENT_USER_NAME, DEFAULT_INITIAL_BALANCE } from '../models/user.model';
import { DisciplineItem } from '../models/discipline-item.model';
import { Goal, GOAL_STATUS } from '../../features/goals/models/goal.model';
import { DailyTask } from '../../features/daily-tasks/models/daily-task.model';
import { DailyScore } from '../../features/daily-scores/models/daily-score.model';
import { PomodoroSession } from '../../features/pomodoro/models/pomodoro-session.model';
import { DailyTaskCompletion } from '../../features/daily-tasks/models/daily-task-completion.model';
import { WithdrawalRecord } from '../../features/rewards/models/withdrawal.model';
import { RewardItem } from '../../features/rewards/models/reward.model';
import { RewardCategory } from '../../features/rewards/models/reward-category.model';
import { INITIAL_REWARD_CATEGORIES } from '../constants/initial-reward-categories.const';


@Service()
export class DbService extends Dexie {
  users!: Table<User, number>;
  tasks!: Table<DisciplineItem, string>;
  goals!: Table<Goal, string>;
  dailyTasks!: Table<DailyTask, string>;
  dailyScores!: Table<DailyScore, string>;
  pomodoroSessions!: Table<PomodoroSession, string>;
  dailyTaskCompletions!: Table<DailyTaskCompletion, string>;
  withdrawals!: Table<WithdrawalRecord, string>;
  rewards!: Table<RewardItem, string>;
  rewardCategories!: Table<RewardCategory, string>;

  constructor() {
    super('pocket-discipline-db');

    this.version(1).stores({
      users: 'id',
      tasks: 'id, type, isCompleted'
    });

    this.version(2).stores({
      goals: 'id, status'
    }).upgrade(async (tx) => {
      const goalsCount = await tx.table('goals').count();
      if (goalsCount === 0) {
        await tx.table('goals').bulkAdd(DbService.getInitialGoals());
      }
    });

    this.version(3).stores({
      dailyTasks: 'id'
    });

    this.version(4).stores({
      dailyScores: 'date'
    });

    this.version(5).stores({
      pomodoroSessions: 'id, startTime, status'
    });

    this.version(6).stores({
      dailyTaskCompletions: 'id, date, taskId'
    });

    this.version(7).stores({
      goals: 'id, status, completedAt'
    });

    this.version(8).stores({
      withdrawals: 'id, date, categoryId, timestamp, rewardId',
      rewards: 'id, categoryId, type, status, createdAt',
      rewardCategories: 'id, name, isProtected'
    }).upgrade(async (tx) => {
      const categoriesCount = await tx.table('rewardCategories').count();
      if (categoriesCount === 0) {
        await tx.table('rewardCategories').bulkAdd(INITIAL_REWARD_CATEGORIES as RewardCategory[]);
      }
    });

    this.on('populate', () => {
      return Promise.all([
        this.users.add({
          id: CURRENT_USER_ID,
          name: CURRENT_USER_NAME,
          balance: DEFAULT_INITIAL_BALANCE,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }),
        this.goals.bulkAdd(DbService.getInitialGoals()),
        this.rewardCategories.bulkAdd(INITIAL_REWARD_CATEGORIES)
      ]);
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

  static isValidPomodoroSession(item: unknown): item is PomodoroSession {
    if (!item || typeof item !== 'object') {
      return false;
    }
    const s = item as Partial<PomodoroSession>;
    return (
      typeof s.id === 'string' &&
      s.id.trim().length > 0 &&
      typeof s.durationMinutes === 'number' &&
      Number.isFinite(s.durationMinutes) &&
      typeof s.startTime === 'number' &&
      Number.isFinite(s.startTime) &&
      typeof s.status === 'string'
    );
  }

  isValidPomodoroSession(item: unknown): item is PomodoroSession {
    return DbService.isValidPomodoroSession(item);
  }

  async migrateLegacyPomodoroDatabase(): Promise<void> {
    try {
      const exists = await Dexie.exists('PomodoroDatabase');
      if (!exists) {
        return;
      }

      const oldDb = new Dexie('PomodoroDatabase');
      oldDb.on('versionchange', () => {
        oldDb.close();
      });

      try {
        await oldDb.open();
        if (oldDb.tables.some(t => t.name === 'sessions')) {
          const rawSessions = await oldDb.table('sessions').toArray();
          const validSessions = rawSessions.filter((s): s is PomodoroSession => DbService.isValidPomodoroSession(s));
          if (validSessions.length > 0) {
            await this.pomodoroSessions.bulkPut(validSessions);
          }
        }
      } finally {
        oldDb.close();
      }

      await Dexie.delete('PomodoroDatabase');
    } catch (error) {
      console.error('Failed to migrate legacy Pomodoro database:', error);
    }
  }

  static getInitialGoals(): Goal[] {
    return [
      {
        id: crypto.randomUUID(),
        title: 'do 50 push-ups on fists',
        rewardValue: 2000,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now()
      },
      {
        id: crypto.randomUUID(),
        title: 'do 100 squats',
        rewardValue: 1500,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now()
      },
      {
        id: crypto.randomUUID(),
        title: 'do 12 pomodoro a day',
        rewardValue: 1500,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now()
      }
    ];
  }

  getInitialGoals(): Goal[] {
    return DbService.getInitialGoals();
  }
}
