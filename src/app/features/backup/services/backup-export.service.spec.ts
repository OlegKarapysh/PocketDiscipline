import { TestBed } from '@angular/core/testing';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import { BACKUP_FORMAT } from '../constants/backup-format.const';
import type { BackupEnvelope } from '../models/backup-envelope.model';
import { BackupExportService } from './backup-export.service';

describe('BackupExportService', () => {
  let db: DbService;
  let service: BackupExportService;
  const now = new Date(2026, 0, 2, 9, 5);
  const fixtures: Record<string, object> = {
    users: { id: 1, name: 'Current', balance: 1234, createdAt: 1, updatedAt: 2 },
    tasks: {
      id: 'task',
      title: 'Read',
      type: 'ONEOFF',
      rewardValue: 10,
      isCompleted: false,
      lastCompletedAt: null,
      createdAt: 1,
    },
    goals: { id: 'jar-202609081930-123450', title: 'Learn', rewardValue: 20, status: 'ACTIVE', createdAt: 1 },
    dailyTasks: {
      id: 'daily',
      title: 'Walk',
      createdAt: 1,
      sortOrder: 0,
      difficulties: [{ id: 'easy', name: 'Easy', baseReward: 5 }],
      streak: 0,
      lastCompletedAt: null,
    },
    dailyScores: { date: '2026-01-01', score: 8, rewardEarned: 30, streakAtThisDay: 1, createdAt: 1 },
    pomodoroSessions: {
      id: 'session',
      durationMinutes: 25,
      engagementType: 'work',
      startTime: 1,
      status: 'completed',
      endTime: 2,
      rewardEarned: 100,
    },
    dailyTaskCompletions: {
      id: 'completion',
      taskId: 'daily',
      date: '2026-01-01',
      difficultyId: 'easy',
      rewardEarned: 5,
      completedAt: 2,
    },
    withdrawals: {
      id: 'withdrawal',
      amount: 10,
      title: 'Tea',
      categoryId: 'general',
      date: '2026-01-01',
      timestamp: 2,
    },
    rewards: {
      id: 'reward',
      title: 'Book',
      cost: 50,
      categoryId: 'general',
      type: 'repeatable',
      status: 'active',
      claimCount: 0,
      createdAt: 1,
      updatedAt: 2,
    },
    rewardCategories: {
      id: 'general',
      name: 'General',
      color: '#6b7280',
      icon: 'category',
      isDefault: true,
      isProtected: true,
      createdAt: 1,
    },
    pomodoroRewardRates: { engagementType: 'study', baseReward: 125 },
  };
  const contents = async () => {
    const file = await service.createBackup();
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : '');
      };
      reader.onerror = () => {
        reject(new Error('Could not read backup'));
      };
      reader.readAsText(file);
    });
    return { file, envelope: JSON.parse(text) as BackupEnvelope };
  };

  beforeEach(async () => {
    db = await openEmptyDb();
    service = TestBed.inject(BackupExportService);
    vi.setSystemTime(now);
  });
  afterEach(() => vi.useRealTimers());

  it('exports every table with every stored row unchanged', async () => {
    for (const table of db.tables) {
      const row = fixtures[table.name];
      expect(row, `Missing fixture for table ${table.name}`).toBeDefined();
      await table.put(row);
    }
    const { envelope } = await contents();
    expect(Object.keys(envelope.data).sort()).toEqual(db.tables.map((table) => table.name).sort());
    for (const table of db.tables) {
      expect(envelope.data[table.name], table.name).toEqual(await table.toArray());
    }
    expect(envelope.data['goals'][0]).not.toHaveProperty('completedAt');
    expect(envelope.data['goals'][0]).toHaveProperty('id', 'jar-202609081930-123450');
    expect(envelope.data['dailyScores'][0]).toHaveProperty('date', '2026-01-01');
    expect(envelope.data['pomodoroRewardRates'][0]).toHaveProperty('engagementType', 'study');
  });

  it('includes empty tables and the versioned envelope in a locally named text file', async () => {
    const { file, envelope } = await contents();
    expect(envelope).toMatchObject({
      format: BACKUP_FORMAT,
      formatVersion: 1,
      schemaVersion: db.verno,
      exportedAt: now.toISOString(),
      encrypted: false,
    });
    expect(envelope.appVersion).not.toBe('');
    expect(envelope.data).toEqual(Object.fromEntries(db.tables.map((table) => [table.name, []])));
    expect(file.name).toBe('pocket-discipline-2026-01-02-0905.txt');
    expect(file.type).toBe('text/plain');
  });

  it('never exports half of a concurrent transaction', async () => {
    const readUsers = db.users.toArray.bind(db.users);
    let writing!: Promise<unknown>;
    vi.spyOn(db.users, 'toArray').mockImplementation(() => {
      const result = readUsers();
      writing = Dexie.ignoreTransaction(() =>
        db.transaction('rw', db.users, db.dailyScores, async () => {
          await db.users.put({ id: 1, name: 'Current', balance: 100, createdAt: 1, updatedAt: 1 });
          await db.dailyScores.put({
            date: '2026-01-01',
            score: 8,
            rewardEarned: 100,
            streakAtThisDay: 1,
            createdAt: 1,
          });
        }),
      );
      return result;
    });
    const { envelope } = await contents();
    await writing;
    expect(envelope.data['users'].length).toBe(0);
    expect(envelope.data['dailyScores'].length).toBe(0);
  });

  it('records only the export timestamp without changing other stored values', async () => {
    const user = { id: 1, name: 'Current', balance: 500, balanceSetUpAt: 10, createdAt: 1, updatedAt: 2 };
    await db.users.put(user);
    for (const table of db.tables.filter((table) => table.name !== 'users')) {
      await table.put(fixtures[table.name]);
    }
    const before = await Promise.all(
      db.tables.filter((table) => table.name !== 'users').map((table) => table.toArray()),
    );
    await service.recordExport();
    expect(await db.users.get(1)).toEqual({ ...user, lastExportedAt: now.getTime() });
    expect(
      await Promise.all(db.tables.filter((table) => table.name !== 'users').map((table) => table.toArray())),
    ).toEqual(before);
  });
});
