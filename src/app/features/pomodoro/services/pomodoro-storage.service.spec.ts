import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroStorageService } from './pomodoro-storage.service';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import { CURRENT_USER_ID, CURRENT_USER_NAME } from '../../../core/models/user.model';

const INITIAL_BALANCE = 10;

const session = (overrides: Partial<PomodoroSession> = {}): PomodoroSession => ({
  id: 'session-123',
  durationMinutes: 25,
  engagementType: EngagementType.WORK,
  startTime: 1000000,
  status: PomodoroSessionStatus.ACTIVE,
  ...overrides,
});

describe('PomodoroStorageService', () => {
  let service: PomodoroStorageService;
  let db: DbService;

  const storedSession = () => db.pomodoroSessions.get('session-123');
  const balance = async () => (await db.users.get(CURRENT_USER_ID))?.balance;

  // A failing database: every operation on a closed Dexie database rejects.
  const breakDatabase = () => {
    db.close();
    return vi.spyOn(console, 'error').mockImplementation(() => undefined);
  };

  // Resolves to what `promise` rejects with, and fails the test if it resolves instead.
  const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
    promise.then(
      () => {
        throw new Error('Expected a rejection');
      },
      (error: unknown) => error,
    );

  beforeEach(async () => {
    db = await openEmptyDb();
    await db.users.add({
      id: CURRENT_USER_ID,
      name: CURRENT_USER_NAME,
      balance: INITIAL_BALANCE,
      createdAt: 0,
      updatedAt: 0,
    });
    service = TestBed.inject(PomodoroStorageService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save and retrieve a session', async () => {
    await service.saveSession(session());

    await expect(storedSession()).resolves.toEqual(session());
    await expect(service.getSession('session-123')).resolves.toEqual(session());
  });

  describe('completeSession', () => {
    it('should mark an active session completed and credit its reward', async () => {
      await db.pomodoroSessions.add(session());

      const completed = await service.completeSession('session-123', 25);

      expect(completed).toBe(true);
      expect(await storedSession()).toEqual(
        expect.objectContaining({ status: PomodoroSessionStatus.COMPLETED, rewardEarned: 25 }),
      );
      expect(await balance()).toBe(INITIAL_BALANCE + 25);
    });

    it('should credit the reward once when the session is completed twice at the same time', async () => {
      await db.pomodoroSessions.add(session());

      const results = await Promise.all([
        service.completeSession('session-123', 25),
        service.completeSession('session-123', 25),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await balance()).toBe(INITIAL_BALANCE + 25);
    });

    it('should neither complete nor credit a session that was cancelled', async () => {
      await db.pomodoroSessions.add(session({ status: PomodoroSessionStatus.CANCELLED }));

      const completed = await service.completeSession('session-123', 25);

      expect(completed).toBe(false);
      expect((await storedSession())?.status).toBe(PomodoroSessionStatus.CANCELLED);
      expect(await balance()).toBe(INITIAL_BALANCE);
    });
  });

  describe('cancelSession', () => {
    it('should mark an active session cancelled', async () => {
      await db.pomodoroSessions.add(session());

      await service.cancelSession('session-123');

      expect((await storedSession())?.status).toBe(PomodoroSessionStatus.CANCELLED);
    });

    it('should leave a session that already completed as completed', async () => {
      await db.pomodoroSessions.add(session());

      await Promise.all([service.completeSession('session-123', 25), service.cancelSession('session-123')]);

      expect((await storedSession())?.status).toBe(PomodoroSessionStatus.COMPLETED);
      expect(await balance()).toBe(INITIAL_BALANCE + 25);
    });
  });

  it('should delete a session by id', async () => {
    await db.pomodoroSessions.bulkAdd([session(), session({ id: 'session-456' })]);

    await service.deleteSession('session-123');

    expect(await db.pomodoroSessions.toCollection().primaryKeys()).toEqual(['session-456']);
  });

  it('should retrieve all sessions ordered by startTime descending', async () => {
    await db.pomodoroSessions.bulkAdd([
      session({ id: 'middle', startTime: 2000000 }),
      session({ id: 'latest', startTime: 3000000 }),
      session({ id: 'earliest', startTime: 1000000 }),
    ]);

    const result = await service.getAllSessions();

    expect(result.map((s) => s.id)).toEqual(['latest', 'middle', 'earliest']);
  });

  it('should log error and rethrow when saveSession fails', async () => {
    const consoleSpy = breakDatabase();

    const error = await rejectionOf(service.saveSession(session()));

    expect(consoleSpy).toHaveBeenCalledWith('Failed to save pomodoro session:', error);
  });

  it('should log error and rethrow when getSession fails', async () => {
    const consoleSpy = breakDatabase();

    const error = await rejectionOf(service.getSession('session-123'));

    expect(consoleSpy).toHaveBeenCalledWith('Failed to get pomodoro session:', error);
  });

  it('should log error and rethrow when getAllSessions fails', async () => {
    const consoleSpy = breakDatabase();

    const error = await rejectionOf(service.getAllSessions());

    expect(consoleSpy).toHaveBeenCalledWith('Failed to get all pomodoro sessions:', error);
  });

  it('should log error and rethrow when completeSession fails', async () => {
    await db.pomodoroSessions.add(session());
    const consoleSpy = breakDatabase();

    const error = await rejectionOf(service.completeSession('session-123', 25));

    expect(consoleSpy).toHaveBeenCalledWith('Failed to complete pomodoro session:', error);
  });

  it('should log error and rethrow when cancelSession fails', async () => {
    await db.pomodoroSessions.add(session());
    const consoleSpy = breakDatabase();

    const error = await rejectionOf(service.cancelSession('session-123'));

    expect(consoleSpy).toHaveBeenCalledWith('Failed to cancel pomodoro session:', error);
  });

  it('should log error and rethrow when deleteSession fails', async () => {
    await db.pomodoroSessions.add(session());
    const consoleSpy = breakDatabase();

    const error = await rejectionOf(service.deleteSession('session-123'));

    expect(consoleSpy).toHaveBeenCalledWith('Failed to delete pomodoro session:', error);
  });
});
