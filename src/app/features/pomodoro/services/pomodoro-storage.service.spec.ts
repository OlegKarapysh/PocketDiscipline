import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroStorageService } from './pomodoro-storage.service';
import { DbService } from '../../../database/db.service';
import { UserService } from '../../../core/services/user.service';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';

describe('PomodoroStorageService', () => {
  let service: PomodoroStorageService;
  let dbMock: {
    pomodoroSessions: {
      put: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      orderBy: ReturnType<typeof vi.fn>;
    };
    users: unknown;
    transaction: ReturnType<typeof vi.fn>;
  };
  let userMock: { addBalance: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // IndexedDB runs overlapping read-write transactions on the same tables one after another.
    let queue: Promise<unknown> = Promise.resolve();
    dbMock = {
      pomodoroSessions: {
        put: vi.fn().mockResolvedValue('session-123'),
        get: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(1),
        delete: vi.fn().mockResolvedValue(undefined),
        orderBy: vi.fn(),
      },
      users: {},
      transaction: vi.fn((...args: unknown[]) => {
        const callback = args[args.length - 1] as () => Promise<unknown>;
        const run = queue.then(callback);
        queue = run.catch(() => undefined);
        return run;
      }),
    };
    userMock = { addBalance: vi.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      providers: [
        PomodoroStorageService,
        { provide: DbService, useValue: dbMock },
        { provide: UserService, useValue: userMock },
      ],
    });
    service = TestBed.inject(PomodoroStorageService);
  });

  function useStoredSession(status: PomodoroSessionStatus): () => PomodoroSession {
    let stored: PomodoroSession = {
      id: 'session-123',
      durationMinutes: 25,
      engagementType: EngagementType.WORK,
      startTime: 1000000,
      status,
    };
    dbMock.pomodoroSessions.get.mockImplementation(() => ({ ...stored }));
    dbMock.pomodoroSessions.update.mockImplementation((_id: string, changes: Partial<PomodoroSession>) => {
      stored = { ...stored, ...changes };
      return 1;
    });
    return () => stored;
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save and retrieve a session', async () => {
    const session: PomodoroSession = {
      id: 'session-123',
      durationMinutes: 25,
      engagementType: EngagementType.WORK,
      startTime: 1000000,
      status: PomodoroSessionStatus.ACTIVE,
    };

    dbMock.pomodoroSessions.put.mockResolvedValue('session-123');
    dbMock.pomodoroSessions.get.mockResolvedValue(session);

    await service.saveSession(session);
    expect(dbMock.pomodoroSessions.put).toHaveBeenCalledWith(session);

    const retrieved = await service.getSession('session-123');
    expect(dbMock.pomodoroSessions.get).toHaveBeenCalledWith('session-123');
    expect(retrieved).toEqual(session);
  });

  describe('completeSession', () => {
    it('should mark an active session completed and credit its reward', async () => {
      const current = useStoredSession(PomodoroSessionStatus.ACTIVE);

      const completed = await service.completeSession('session-123', 25);

      expect(completed).toBe(true);
      expect(current()).toEqual(expect.objectContaining({ status: PomodoroSessionStatus.COMPLETED, rewardEarned: 25 }));
      expect(userMock.addBalance).toHaveBeenCalledWith(25);
    });

    it('should credit the reward once when the session is completed twice at the same time', async () => {
      useStoredSession(PomodoroSessionStatus.ACTIVE);

      const results = await Promise.all([
        service.completeSession('session-123', 25),
        service.completeSession('session-123', 25),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(userMock.addBalance).toHaveBeenCalledTimes(1);
    });

    it('should neither complete nor credit a session that was cancelled', async () => {
      const current = useStoredSession(PomodoroSessionStatus.CANCELLED);

      const completed = await service.completeSession('session-123', 25);

      expect(completed).toBe(false);
      expect(current().status).toBe(PomodoroSessionStatus.CANCELLED);
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });
  });

  describe('cancelSession', () => {
    it('should mark an active session cancelled', async () => {
      const current = useStoredSession(PomodoroSessionStatus.ACTIVE);

      await service.cancelSession('session-123');

      expect(current().status).toBe(PomodoroSessionStatus.CANCELLED);
    });

    it('should leave a session that already completed as completed', async () => {
      const current = useStoredSession(PomodoroSessionStatus.ACTIVE);

      await Promise.all([service.completeSession('session-123', 25), service.cancelSession('session-123')]);

      expect(current().status).toBe(PomodoroSessionStatus.COMPLETED);
      expect(userMock.addBalance).toHaveBeenCalledTimes(1);
    });
  });

  it('should delete a session by id', async () => {
    await service.deleteSession('session-123');
    expect(dbMock.pomodoroSessions.delete).toHaveBeenCalledWith('session-123');
  });

  it('should retrieve all sessions ordered by startTime descending', async () => {
    const sessionList: PomodoroSession[] = [
      {
        id: 'session-123',
        durationMinutes: 25,
        engagementType: EngagementType.WORK,
        startTime: 1000000,
        status: PomodoroSessionStatus.COMPLETED,
      },
    ];

    const toArrayMock = vi.fn().mockResolvedValue(sessionList);
    const reverseMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
    dbMock.pomodoroSessions.orderBy.mockReturnValue({ reverse: reverseMock });

    const result = await service.getAllSessions();
    expect(dbMock.pomodoroSessions.orderBy).toHaveBeenCalledWith('startTime');
    expect(reverseMock).toHaveBeenCalled();
    expect(result).toEqual(sessionList);
  });

  it('should log error and rethrow when saveSession fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const testError = new Error('Database put failure');
    dbMock.pomodoroSessions.put.mockRejectedValue(testError);

    const session: PomodoroSession = {
      id: 'session-123',
      durationMinutes: 25,
      engagementType: EngagementType.WORK,
      startTime: 1000000,
      status: PomodoroSessionStatus.ACTIVE,
    };

    await expect(service.saveSession(session)).rejects.toThrow(testError);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to save pomodoro session:', testError);
    consoleSpy.mockRestore();
  });

  it('should log error and rethrow when getSession fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const testError = new Error('Database get failure');
    dbMock.pomodoroSessions.get.mockRejectedValue(testError);

    await expect(service.getSession('session-123')).rejects.toThrow(testError);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to get pomodoro session:', testError);
    consoleSpy.mockRestore();
  });

  it('should log error and rethrow when getAllSessions fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const testError = new Error('Database query failure');
    const toArrayMock = vi.fn().mockRejectedValue(testError);
    const reverseMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
    dbMock.pomodoroSessions.orderBy.mockReturnValue({ reverse: reverseMock });

    await expect(service.getAllSessions()).rejects.toThrow(testError);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to get all pomodoro sessions:', testError);
    consoleSpy.mockRestore();
  });

  it('should log error and rethrow when completeSession fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const testError = new Error('Database update failure');
    useStoredSession(PomodoroSessionStatus.ACTIVE);
    dbMock.pomodoroSessions.update.mockRejectedValue(testError);

    await expect(service.completeSession('session-123', 25)).rejects.toThrow(testError);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to complete pomodoro session:', testError);
    consoleSpy.mockRestore();
  });

  it('should log error and rethrow when cancelSession fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const testError = new Error('Database update failure');
    useStoredSession(PomodoroSessionStatus.ACTIVE);
    dbMock.pomodoroSessions.update.mockRejectedValue(testError);

    await expect(service.cancelSession('session-123')).rejects.toThrow(testError);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to cancel pomodoro session:', testError);
    consoleSpy.mockRestore();
  });

  it('should log error and rethrow when deleteSession fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const testError = new Error('Database delete failure');
    dbMock.pomodoroSessions.delete.mockRejectedValue(testError);

    await expect(service.deleteSession('session-123')).rejects.toThrow(testError);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to delete pomodoro session:', testError);
    consoleSpy.mockRestore();
  });
});
