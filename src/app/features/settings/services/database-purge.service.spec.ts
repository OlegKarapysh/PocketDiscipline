import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import { PomodoroTimerService } from '../../pomodoro/services/pomodoro-timer.service';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import { CURRENT_USER_ID, CURRENT_USER_NAME, DEFAULT_INITIAL_BALANCE } from '../../../core/models/user.model';
import { DatabasePurgeService } from './database-purge.service';

describe('DatabasePurgeService', () => {
  let service: DatabasePurgeService;
  let db: DbService;
  let timer: PomodoroTimerService;

  beforeEach(async () => {
    db = await openEmptyDb();
    await db.users.add({
      id: CURRENT_USER_ID,
      name: CURRENT_USER_NAME,
      balance: 500,
      createdAt: 0,
      updatedAt: 0,
    });

    // A pomodoro is running when the user purges.
    timer = TestBed.inject(PomodoroTimerService);
    await vi.waitFor(() => {
      expect(timer.isRestoring()).toBe(false);
    });
    await timer.startTimer();

    service = TestBed.inject(DatabasePurgeService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should purge the database and stop the running timer', async () => {
    await service.purge();

    expect(await db.pomodoroSessions.count()).toBe(0);
    expect((await db.users.get(CURRENT_USER_ID))?.balance).toBe(DEFAULT_INITIAL_BALANCE);
    expect(timer.isActive()).toBe(false);
    expect(timer.currentSessionId()).toBeNull();
  });

  it('should leave the timer running and not swallow the error when the purge fails', async () => {
    vi.spyOn(db, 'purgeDatabase').mockRejectedValue(new Error('boom'));

    await expect(service.purge()).rejects.toThrow('boom');

    expect(timer.isActive()).toBe(true);
    const sessions = await db.pomodoroSessions.toArray();
    expect(sessions.map((s) => s.status)).toEqual([PomodoroSessionStatus.ACTIVE]);
  });
});
