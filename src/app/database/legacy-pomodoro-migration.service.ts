import { Service } from '@angular/core';
import type { Table } from 'dexie';
import Dexie from 'dexie';
import type { PomodoroSession } from '../core/models/pomodoro-session.model';

const LEGACY_DB_NAME = 'PomodoroDatabase';

@Service()
export class LegacyPomodoroMigrationService {
  async migrate(target: Table<PomodoroSession, string>): Promise<void> {
    try {
      const exists = await Dexie.exists(LEGACY_DB_NAME);
      if (!exists) {
        return;
      }

      const oldDb = new Dexie(LEGACY_DB_NAME);
      oldDb.on('versionchange', () => {
        oldDb.close();
      });

      try {
        await oldDb.open();
        if (oldDb.tables.some((t) => t.name === 'sessions')) {
          const rawSessions = await oldDb.table('sessions').toArray();
          const validSessions = rawSessions
            .filter((s): s is PomodoroSession => this.isValidSession(s))
            .map((s) => this.withRoundedReward(s));
          if (validSessions.length > 0) {
            await target.bulkPut(validSessions);
          }
        }
      } finally {
        oldDb.close();
      }

      await Dexie.delete(LEGACY_DB_NAME);
    } catch (error) {
      console.error('Failed to migrate legacy Pomodoro database:', error);
    }
  }

  // Money is a whole number of hryvnias. The legacy database is read on `ready`, after the v9 upgrade
  // has rounded the main database, so its rows are rounded here on the way in.
  private withRoundedReward(session: PomodoroSession): PomodoroSession {
    return typeof session.rewardEarned === 'number'
      ? { ...session, rewardEarned: Math.round(session.rewardEarned) || 0 }
      : session;
  }

  private isValidSession(item: unknown): item is PomodoroSession {
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
}
