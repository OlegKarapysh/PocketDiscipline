import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroStorageService } from './pomodoro-storage.service';
import { DbService } from '../../../core/services/db.service';
import { PomodoroSession } from '../models/pomodoro-session.model';
import { EngagementType } from '../models/engagement-type.enum';
import { PomodoroSessionStatus } from '../models/pomodoro-session-status.enum';

const TEST_SESSION_ID = 'session-123';
const TEST_DURATION = 25;
const TEST_START_TIME = 1000000;
const TEST_END_TIME = 1001500;
const TEST_REWARD = 25;
const ORDER_BY_FIELD = 'startTime';

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
        put: vi.fn().mockResolvedValue(TEST_SESSION_ID),
        get: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(1),
        delete: vi.fn().mockResolvedValue(undefined),
        orderBy: vi.fn(),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        PomodoroStorageService,
        { provide: DbService, useValue: dbMock },
      ],
    });
    service = TestBed.inject(PomodoroStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save and retrieve a session', async () => {
    const session: PomodoroSession = {
      id: TEST_SESSION_ID,
      durationMinutes: TEST_DURATION,
      engagementType: EngagementType.WORK,
      startTime: TEST_START_TIME,
      status: PomodoroSessionStatus.ACTIVE,
    };

    dbMock.pomodoroSessions.put.mockResolvedValue(TEST_SESSION_ID);
    dbMock.pomodoroSessions.get.mockResolvedValue(session);

    await service.saveSession(session);
    expect(dbMock.pomodoroSessions.put).toHaveBeenCalledWith(session);

    const retrieved = await service.getSession(TEST_SESSION_ID);
    expect(dbMock.pomodoroSessions.get).toHaveBeenCalledWith(TEST_SESSION_ID);
    expect(retrieved).toEqual(session);
  });

  it('should update a session with completion data', async () => {
    const changes: Partial<PomodoroSession> = {
      status: PomodoroSessionStatus.COMPLETED,
      endTime: TEST_END_TIME,
      rewardEarned: TEST_REWARD,
    };

    await service.updateSession(TEST_SESSION_ID, changes);
    expect(dbMock.pomodoroSessions.update).toHaveBeenCalledWith(TEST_SESSION_ID, changes);
  });

  it('should delete a session by id', async () => {
    await service.deleteSession(TEST_SESSION_ID);
    expect(dbMock.pomodoroSessions.delete).toHaveBeenCalledWith(TEST_SESSION_ID);
  });

  it('should retrieve all sessions ordered by startTime descending', async () => {
    const sessionList: PomodoroSession[] = [
      {
        id: TEST_SESSION_ID,
        durationMinutes: TEST_DURATION,
        engagementType: EngagementType.WORK,
        startTime: TEST_START_TIME,
        status: PomodoroSessionStatus.COMPLETED,
      },
    ];

    const toArrayMock = vi.fn().mockResolvedValue(sessionList);
    const reverseMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
    dbMock.pomodoroSessions.orderBy.mockReturnValue({ reverse: reverseMock });

    const result = await service.getAllSessions();
    expect(dbMock.pomodoroSessions.orderBy).toHaveBeenCalledWith(ORDER_BY_FIELD);
    expect(reverseMock).toHaveBeenCalled();
    expect(result).toEqual(sessionList);
  });
});

