import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NotificationService } from './notification.service';
import { DailyScoresService } from '../../features/daily-scores/services/daily-scores.service';
import { DailyScore } from '../../features/daily-scores/models/daily-score.model';

describe('NotificationService', () => {
  let service: NotificationService;
  let dailyScoresServiceMock: {
    getTodayScore: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    dailyScoresServiceMock = {
      getTodayScore: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: DailyScoresService, useValue: dailyScoresServiceMock },
      ],
    });

    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false if Notification API is not supported in window', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalNotification = (window as any).Notification;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).Notification;

    const result = await service.requestPermission();
    expect(result).toBe(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Notification = originalNotification;
  });

  it('should return true if Notification.permission is already granted', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Notification = {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };

    const result = await service.requestPermission();
    expect(result).toBe(true);
  });

  it('should request permission if not already denied', async () => {
    const requestPermissionMock = vi.fn().mockResolvedValue('granted');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Notification = {
      permission: 'default',
      requestPermission: requestPermissionMock,
    };

    const result = await service.requestPermission();
    expect(requestPermissionMock).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should return false if requestPermission is denied', async () => {
    const requestPermissionMock = vi.fn().mockResolvedValue('denied');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Notification = {
      permission: 'default',
      requestPermission: requestPermissionMock,
    };

    const result = await service.requestPermission();
    expect(result).toBe(false);
  });

  it('should create notification if today score is not set', async () => {
    const notificationConstructor = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Notification = notificationConstructor;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Notification.permission = 'granted';

    dailyScoresServiceMock.getTodayScore.mockReturnValue(of(undefined));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service as any).checkAndNotify();

    expect(notificationConstructor).toHaveBeenCalledWith(
      'Pocket Discipline',
      expect.objectContaining({
        body: 'Time to set your daily score!',
      })
    );
  });

  it('should not create notification if today score is already recorded', async () => {
    const notificationConstructor = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Notification = notificationConstructor;

    const mockScore: DailyScore = {
      date: '2026-08-28',
      score: 10,
      rewardEarned: 500,
      streakAtThisDay: 1,
      createdAt: Date.now(),
    };
    dailyScoresServiceMock.getTodayScore.mockReturnValue(of(mockScore));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service as any).checkAndNotify();

    expect(notificationConstructor).not.toHaveBeenCalled();
  });
});
