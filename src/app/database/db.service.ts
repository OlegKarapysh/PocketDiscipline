import { Service, inject } from '@angular/core';
import type { Table } from 'dexie';
import Dexie from 'dexie';
import type { User} from '../core/models/user.model';
import { CURRENT_USER_ID, CURRENT_USER_NAME, DEFAULT_INITIAL_BALANCE } from '../core/models/user.model';
import type { DisciplineItem } from '../core/models/discipline-item.model';
import type { Goal } from '../core/models/goal.model';
import type { DailyTask } from '../core/models/daily-task.model';
import type { DailyScore } from '../core/models/daily-score.model';
import type { PomodoroSession } from '../core/models/pomodoro-session.model';
import type { DailyTaskCompletion } from '../core/models/daily-task-completion.model';
import type { WithdrawalRecord } from '../core/models/withdrawal.model';
import type { RewardItem } from '../core/models/reward.model';
import type { RewardCategory } from '../core/models/reward-category.model';
import { INITIAL_REWARD_CATEGORIES } from '../core/constants/initial-reward-categories.const';
import { getInitialGoals } from '../core/constants/initial-goals.const';
import { LegacyPomodoroMigrationService } from './legacy-pomodoro-migration.service';


/**
 * The persistence composition root.
 *
 * This is the one place allowed to know every vertical slice at once: the Dexie schema is
 * version-ordered, so the table declarations and the version(N).stores() blocks cannot be split
 * across feature folders without inviting migration bugs. It lives outside core/ for that reason:
 * core/ is forbidden from importing features/, and this file is deliberately exempt from that rule.
 *
 * The database name and every existing version(N).stores() block are load-bearing: changing either
 * discards existing users' IndexedDB data. Add a new version, never edit an old one.
 *
 * See docs/schema.md for the table-by-table reference.
 */
@Service()
export class DbService extends Dexie {
  private legacyPomodoroMigration = inject(LegacyPomodoroMigrationService);

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
        await tx.table('goals').bulkAdd(getInitialGoals());
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
        await tx.table<RewardCategory, string>('rewardCategories').bulkAdd([...INITIAL_REWARD_CATEGORIES]);
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
        this.goals.bulkAdd(getInitialGoals()),
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

      await this.legacyPomodoroMigration.migrate(this.pomodoroSessions);
    });
  }
}
