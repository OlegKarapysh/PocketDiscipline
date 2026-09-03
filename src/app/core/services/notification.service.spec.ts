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
  const originalNotification = window.Notification;

  beforeEach(() => {
    vi.useFakeTimers();

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
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.Notification = originalNotification;
  });

  describe('requestPermission', () => {
    it('should return false if Notification API is not supported in window', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).Notification;

      const result = await service.requestPermission();
      expect(result).toBe(false);
    });

    it('should return true if Notification.permission is already granted', async () => {
      vi.stubGlobal('Notification', {
        permission: 'granted',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      });

      const result = await service.requestPermission();
      expect(result).toBe(true);
    });

    it('should request permission if not already denied', async () => {
      const requestPermissionMock = vi.fn().mockResolvedValue('granted');
      vi.stubGlobal('Notification', {
        permission: 'default',
        requestPermission: requestPermissionMock,
      });

      const result = await service.requestPermission();
      expect(requestPermissionMock).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if requestPermission is denied', async () => {
      const requestPermissionMock = vi.fn().mockResolvedValue('denied');
      vi.stubGlobal('Notification', {
        permission: 'default',
        requestPermission: requestPermissionMock,
      });

      const result = await service.requestPermission();
      expect(result).toBe(false);
    });
  });

  describe('scheduleDailyReminder', () => {
    it('should not schedule any reminder if permission is denied', async () => {
      vi.stubGlobal('Notification', {
        permission: 'denied',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      });

      await service.scheduleDailyReminder();

      expect(vi.getTimerCount()).toBe(0);
    });

    it('should schedule reminder and trigger notification at 21:30 when score is not set', async () => {
      const notificationSpy = vi.fn();
      Object.assign(notificationSpy, {
        permission: 'granted',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      });
      vi.stubGlobal('Notification', notificationSpy);

      // Set time to 10:00:00 on test day
      vi.setSystemTime(new Date(2026, 7, 28, 10, 0, 0));
      dailyScoresServiceMock.getTodayScore.mockReturnValue(of(undefined));

      await service.scheduleDailyReminder();

      // Ensure timer was scheduled
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      // Advance time to 21:30:00 (11 hours and 30 minutes later)
      await vi.advanceTimersByTimeAsync(11.5 * 60 * 60 * 1000);

      expect(notificationSpy).toHaveBeenCalledWith(
        'Pocket Discipline',
        expect.objectContaining({
          body: 'Time to set your daily score!',
        })
      );
    });

    it('should schedule reminder but not trigger notification when score is already recorded', async () => {
      const notificationSpy = vi.fn();
      Object.assign(notificationSpy, {
        permission: 'granted',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      });
      vi.stubGlobal('Notification', notificationSpy);

      vi.setSystemTime(new Date(2026, 7, 28, 10, 0, 0));

      const mockScore: DailyScore = {
        date: '2026-08-28',
        score: 10,
        rewardEarned: 500,
        streakAtThisDay: 1,
        createdAt: Date.now(),
      };
      dailyScoresServiceMock.getTodayScore.mockReturnValue(of(mockScore));

      await service.scheduleDailyReminder();

      await vi.advanceTimersByTimeAsync(11.5 * 60 * 60 * 1000);

      expect(notificationSpy).not.toHaveBeenCalled();
    });
  });
});
