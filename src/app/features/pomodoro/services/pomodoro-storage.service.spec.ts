import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroStorageService } from './pomodoro-storage.service';
import { PomodoroSession, POMODORO_SESSION_STATUS, ENGAGEMENT_TYPE } from '../models/pomodoro-session.model';

const TEST_SESSION_ID = 'session-123';
const TEST_DURATION = 25;
const TEST_START_TIME = 1000000;
const TEST_END_TIME = 1001500;
const TEST_REWARD = 25;

describe('PomodoroStorageService', () => {
  let service: PomodoroStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PomodoroStorageService],
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
      engagementType: ENGAGEMENT_TYPE.WORK,
      startTime: TEST_START_TIME,
      status: POMODORO_SESSION_STATUS.ACTIVE,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbSpy = (service as any).db.sessions;
    const putSpy = vi.spyOn(dbSpy, 'put').mockResolvedValue(TEST_SESSION_ID);
    const getSpy = vi.spyOn(dbSpy, 'get').mockResolvedValue(session);

    await service.saveSession(session);
    expect(putSpy).toHaveBeenCalledWith(session);

    const retrieved = await service.getSession(TEST_SESSION_ID);
    expect(getSpy).toHaveBeenCalledWith(TEST_SESSION_ID);
    expect(retrieved).toEqual(session);
  });

  it('should update a session with completion data', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbSpy = (service as any).db.sessions;
    const updateSpy = vi.spyOn(dbSpy, 'update').mockResolvedValue(1);

    const changes: Partial<PomodoroSession> = {
      status: POMODORO_SESSION_STATUS.COMPLETED,
      endTime: TEST_END_TIME,
      rewardEarned: TEST_REWARD,
    };

    await service.updateSession(TEST_SESSION_ID, changes);
    expect(updateSpy).toHaveBeenCalledWith(TEST_SESSION_ID, changes);
  });

  it('should delete a session by id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbSpy = (service as any).db.sessions;
    const deleteSpy = vi.spyOn(dbSpy, 'delete').mockResolvedValue(undefined);

    await service.deleteSession(TEST_SESSION_ID);
    expect(deleteSpy).toHaveBeenCalledWith(TEST_SESSION_ID);
  });

  it('should retrieve all sessions ordered by startTime descending', async () => {
    const sessionList: PomodoroSession[] = [
      {
        id: TEST_SESSION_ID,
        durationMinutes: TEST_DURATION,
        engagementType: ENGAGEMENT_TYPE.WORK,
        startTime: TEST_START_TIME,
        status: POMODORO_SESSION_STATUS.COMPLETED,
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbSpy = (service as any).db.sessions;
    const toArrayMock = vi.fn().mockResolvedValue(sessionList);
    const reverseMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
    const orderBySpy = vi.spyOn(dbSpy, 'orderBy').mockReturnValue({ reverse: reverseMock } as never);

    const result = await service.getAllSessions();
    expect(orderBySpy).toHaveBeenCalledWith('startTime');
    expect(reverseMock).toHaveBeenCalled();
    expect(result).toEqual(sessionList);
  });
});
