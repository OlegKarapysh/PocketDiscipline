import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroStorageService } from './pomodoro-storage.service';
import { DbService } from '../../../database/db.service';
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
  };

  beforeEach(() => {
    dbMock = {
      pomodoroSessions: {
        put: vi.fn().mockResolvedValue('session-123'),
        get: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(1),
        delete: vi.fn().mockResolvedValue(undefined),
        orderBy: vi.fn(),
      },
    };

    TestBed.configureTestingModule({
      providers: [PomodoroStorageService, { provide: DbService, useValue: dbMock }],
    });
    service = TestBed.inject(PomodoroStorageService);
  });

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

  it('should update a session with completion data', async () => {
    const changes: Partial<PomodoroSession> = {
      status: PomodoroSessionStatus.COMPLETED,
      endTime: 1001500,
      rewardEarned: 25,
    };

    await service.updateSession('session-123', changes);
    expect(dbMock.pomodoroSessions.update).toHaveBeenCalledWith('session-123', changes);
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

  it('should log error and rethrow when updateSession fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const testError = new Error('Database update failure');
    dbMock.pomodoroSessions.update.mockRejectedValue(testError);

    await expect(service.updateSession('session-123', {})).rejects.toThrow(testError);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to update pomodoro session:', testError);
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
