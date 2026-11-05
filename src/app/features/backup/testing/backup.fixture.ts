import type { BackupEnvelope } from '../models/backup-envelope.model';
import { BACKUP_FORMAT } from '../constants/backup-format.const';
import { BACKUP_TABLES } from '../validation/backup-schema.const';
import { ONE_DAY_MS } from '../../../core/constants/one-day-ms.const';

export function backupFixture(schemaVersion = 11): BackupEnvelope {
  const rows: Record<string, unknown[]> = {
    users: [{ id: 1, name: 'Synthetic profile', balance: -12, createdAt: 0, updatedAt: 1 }],
    tasks: [
      {
        id: 'task',
        title: 'Read',
        type: 'ONEOFF',
        rewardValue: 10,
        isCompleted: false,
        lastCompletedAt: null,
        createdAt: 1,
      },
    ],
    goals: [
      {
        id: 'jar-202609081930-123450',
        title: 'Learn',
        rewardValue: 20,
        status: 'COMPLETED',
        completedAt: 2,
        createdAt: 1,
      },
    ],
    dailyTasks: [
      {
        id: 'daily',
        title: 'Walk',
        createdAt: 1,
        ...(schemaVersion >= 10 ? { sortOrder: 3 } : {}),
        difficulties: [{ id: 'easy', name: 'Easy', baseReward: 5 }],
        streak: 12,
        lastCompletedAt: null,
      },
    ],
    dailyScores: [{ date: '2024-02-29', score: 8, rewardEarned: 30, streakAtThisDay: 2, createdAt: 1 }],
    pomodoroSessions: [
      {
        id: 'session',
        durationMinutes: 17.5,
        engagementType: 'work',
        startTime: 1,
        endTime: 2,
        status: 'completed',
        rewardEarned: 100,
      },
    ],
    dailyTaskCompletions: [
      {
        id: 'completion',
        taskId: 'deleted-task',
        difficultyId: 'deleted-difficulty',
        date: '2024-02-29',
        rewardEarned: 5,
        completedAt: 2,
      },
    ],
    withdrawals: [
      {
        id: 'withdrawal',
        amount: 10,
        title: 'Tea',
        categoryId: 'cat-general',
        date: '2024-02-29',
        timestamp: 2,
        rewardId: 'deleted-reward',
      },
    ],
    rewards: [
      {
        id: 'reward',
        title: 'Book',
        cost: 50,
        categoryId: 'cat-general',
        type: 'repeatable',
        status: 'active',
        claimCount: 0,
        createdAt: 1,
        description: '',
        icon: 'book',
        claimedAt: null,
      },
    ],
    rewardCategories: [
      {
        id: 'cat-general',
        name: 'General',
        color: '#aBc',
        icon: 'category',
        isDefault: true,
        isProtected: true,
        createdAt: 0,
      },
    ],
    pomodoroRewardRates: [{ engagementType: 'study', baseReward: 125 }],
  };
  return {
    format: BACKUP_FORMAT,
    formatVersion: 1,
    schemaVersion,
    appVersion: '0.0.0',
    exportedAt: '2026-11-01T17:30:12.345Z',
    encrypted: false,
    data: Object.fromEntries(
      Object.entries(BACKUP_TABLES)
        .filter(([, value]) => value.since <= schemaVersion)
        .map(([table]) => [table, rows[table]]),
    ),
  };
}

export function malformedBackupFixture(): unknown {
  return { ...backupFixture(), data: { users: 'invalid' } };
}

export function largeBackupFixture(days = 5 * 365): BackupEnvelope {
  const envelope = backupFixture();
  const completions: unknown[] = [];
  const sessions: unknown[] = [];
  const withdrawals: unknown[] = [];
  const scores: unknown[] = [];
  const start = Date.UTC(2020, 0, 1);
  for (let day = 0; day < days; day++) {
    const timestamp = start + day * ONE_DAY_MS;
    const date = new Date(timestamp).toISOString().slice(0, 10);
    for (let index = 0; index < 20; index++)
      completions.push({
        id: `completion-${day}-${index}`,
        taskId: 'historical-task',
        difficultyId: 'removed-level',
        date,
        rewardEarned: 5,
        completedAt: timestamp + index,
      });
    for (let index = 0; index < 12; index++)
      sessions.push({
        id: `session-${day}-${index}`,
        durationMinutes: 25,
        engagementType: 'work',
        startTime: timestamp + index * 1_500_000,
        endTime: timestamp + (index + 1) * 1_500_000,
        status: 'completed',
        rewardEarned: 100,
      });
    for (let index = 0; index < 10; index++)
      withdrawals.push({
        id: `withdrawal-${day}-${index}`,
        amount: 10,
        title: 'Synthetic purchase',
        categoryId: 'cat-general',
        date,
        timestamp: timestamp + index,
      });
    scores.push({ date, score: 8, rewardEarned: 30, streakAtThisDay: day + 1, createdAt: timestamp });
  }
  envelope.data['dailyTaskCompletions'] = completions;
  envelope.data['pomodoroSessions'] = sessions;
  envelope.data['withdrawals'] = withdrawals;
  envelope.data['dailyScores'] = scores;
  return envelope;
}
