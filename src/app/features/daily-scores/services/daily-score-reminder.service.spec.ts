import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { DailyScoreReminderService } from './daily-score-reminder.service';
import { DailyScoresService } from './daily-scores.service';
import { BrowserNotificationService } from '../../../core/services/browser-notification.service';
import type { DailyScore } from '../../../core/models/daily-score.model';

describe('DailyScoreReminderService', () => {
  let service: DailyScoreReminderService;
  let notificationsMock: {
    requestPermission: ReturnType<typeof vi.fn>;
    show: ReturnType<typeof vi.fn>;
  };
  let dailyScoresMock: {
    getTodayScore: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();

    notificationsMock = {
      requestPermission: vi.fn().mockResolvedValue(true),
      show: vi.fn(),
    };
    dailyScoresMock = {
      getTodayScore: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        DailyScoreReminderService,
        { provide: BrowserNotificationService, useValue: notificationsMock },
        { provide: DailyScoresService, useValue: dailyScoresMock },
      ],
    });

    service = TestBed.inject(DailyScoreReminderService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should not schedule any reminder if permission is denied', async () => {
    notificationsMock.requestPermission.mockResolvedValue(false);

    const granted = await firstValueFrom(service.scheduleDailyReminder());

    expect(granted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('should schedule reminder and trigger notification at 21:30 when score is not set', async () => {
    vi.setSystemTime(new Date(2026, 7, 28, 10, 0, 0));
    dailyScoresMock.getTodayScore.mockReturnValue(of(undefined));

    const granted = await firstValueFrom(service.scheduleDailyReminder());
    expect(granted).toBe(true);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    await vi.advanceTimersByTimeAsync(11.5 * 60 * 60 * 1000);

    expect(notificationsMock.show).toHaveBeenCalledWith(
      'Pocket Discipline',
      expect.objectContaining({ body: 'Time to set your daily score!' })
    );
  });

  it('should schedule reminder but not trigger notification when score is already recorded', async () => {
    vi.setSystemTime(new Date(2026, 7, 28, 10, 0, 0));

    const mockScore: DailyScore = {
      date: '2026-08-28',
      score: 10,
      rewardEarned: 500,
      streakAtThisDay: 1,
      createdAt: Date.now(),
    };
    dailyScoresMock.getTodayScore.mockReturnValue(of(mockScore));

    const granted = await firstValueFrom(service.scheduleDailyReminder());
    expect(granted).toBe(true);

    await vi.advanceTimersByTimeAsync(11.5 * 60 * 60 * 1000);

    expect(notificationsMock.show).not.toHaveBeenCalled();
  });

  it('should roll the reminder to the next day when scheduled after 21:30', async () => {
    vi.setSystemTime(new Date(2026, 7, 28, 22, 0, 0));

    await firstValueFrom(service.scheduleDailyReminder());

    // 21:30 has passed today, so nothing should fire before tomorrow's 21:30 (23.5h away).
    await vi.advanceTimersByTimeAsync(23 * 60 * 60 * 1000);
    expect(notificationsMock.show).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(notificationsMock.show).toHaveBeenCalledTimes(1);
  });

  it('should re-arm itself after firing', async () => {
    vi.setSystemTime(new Date(2026, 7, 28, 10, 0, 0));

    await firstValueFrom(service.scheduleDailyReminder());
    await vi.advanceTimersByTimeAsync(11.5 * 60 * 60 * 1000);
    expect(notificationsMock.show).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    expect(notificationsMock.show).toHaveBeenCalledTimes(2);
  });

  it('should catch error and return false if requestPermission throws', async () => {
    notificationsMock.requestPermission.mockRejectedValue(new Error('Permission error'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const granted = await firstValueFrom(service.scheduleDailyReminder());

    expect(granted).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to schedule daily reminder:',
      expect.any(Error)
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it('should log and keep the schedule alive when the score lookup fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.setSystemTime(new Date(2026, 7, 28, 10, 0, 0));
    dailyScoresMock.getTodayScore.mockImplementation(() => {
      throw new Error('db down');
    });

    await firstValueFrom(service.scheduleDailyReminder());
    await vi.advanceTimersByTimeAsync(11.5 * 60 * 60 * 1000);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to check today score for notification',
      expect.any(Error)
    );
    expect(notificationsMock.show).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });
});
