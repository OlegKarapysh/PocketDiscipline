import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroStorageService } from './pomodoro-storage.service';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import { CURRENT_USER_ID, CURRENT_USER_NAME } from '../../../core/models/user.model';
import Dexie from 'dexie';

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
  };

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

  it('rejects stale guarded writes without changing session or balance', async () => {
    await db.pomodoroSessions.put(session());
    await service.saveSession(session({ id: 'stale' }), () => false);
    await service.cancelSession('session-123', () => false);
    expect(await service.completeSession('session-123', 100, () => false)).toBe(false);
    expect(await db.pomodoroSessions.toArray()).toEqual([session()]);
    expect(await balance()).toBe(INITIAL_BALANCE);
  });

  it('rechecks queued writes after a transaction lock is acquired', async () => {
    await db.pomodoroSessions.put(session());
    let unlock!: () => void;
    let locked!: () => void;
    const acquired = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const release = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    const blocking = db.transaction('rw', db.pomodoroSessions, async () => {
      locked();
      await Dexie.waitFor(release);
    });
    await acquired;
    let allowed = true;
    const saving = Dexie.ignoreTransaction(() => service.saveSession(session({ id: 'queued' }), () => allowed));
    const cancelling = Dexie.ignoreTransaction(() => service.cancelSession('session-123', () => allowed));
    const completing = Dexie.ignoreTransaction(() => service.completeSession('session-123', 100, () => allowed));
    allowed = false;
    unlock();
    await Promise.all([blocking, saving, cancelling, completing]);
    expect(await Dexie.ignoreTransaction(() => db.pomodoroSessions.toArray())).toEqual([session()]);
    expect(await Dexie.ignoreTransaction(() => balance())).toBe(INITIAL_BALANCE);
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

  it.each([
    ['saveSession', () => service.saveSession(session())],
    ['getSession', () => service.getSession('session-123')],
    ['getAllSessions', () => service.getAllSessions()],
    ['completeSession', () => service.completeSession('session-123', 25)],
    ['cancelSession', () => service.cancelSession('session-123')],
    ['deleteSession', () => service.deleteSession('session-123')],
  ])('should reject when %s cannot reach the database', async (_name, operation) => {
    await db.pomodoroSessions.add(session());
    breakDatabase();

    await expect(operation()).rejects.toBeDefined();
  });
});
