import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorSubject, Subject, of } from 'rxjs';
import type { TimerConfig } from './pomodoro-timer.service';
import { PomodoroTimerService } from './pomodoro-timer.service';
import { PomodoroStorageService } from './pomodoro-storage.service';
import { PomodoroRewardRateService } from './pomodoro-reward-rate.service';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import type { PomodoroRewardRates } from '../models/pomodoro-reward-rates.type';
import { CelebrationService } from '../../../shared/services/celebration.service';
import { SnackBarService } from '../../../shared/services/snack-bar.service';
import { BrowserNotificationService } from '../../../core/services/browser-notification.service';

describe('PomodoroTimerService', () => {
  let service: PomodoroTimerService;
  let storageMock: {
    saveSession: ReturnType<typeof vi.fn>;
    completeSession: ReturnType<typeof vi.fn>;
    cancelSession: ReturnType<typeof vi.fn>;
    getAllSessions: ReturnType<typeof vi.fn>;
  };
  let celebrationMock: { show: ReturnType<typeof vi.fn> };
  let rewardRatesMock: { getRates: ReturnType<typeof vi.fn>; rates$: Subject<PomodoroRewardRates> };
  let snackBarMock: { show: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const createService = (sessions: PomodoroSession[] | Promise<PomodoroSession[]> = []) => {
    TestBed.resetTestingModule();
    storageMock.getAllSessions.mockReturnValue(Promise.resolve(sessions));
    TestBed.configureTestingModule({
      providers: [
        PomodoroTimerService,
        { provide: PomodoroStorageService, useValue: storageMock },
        { provide: CelebrationService, useValue: celebrationMock },
        { provide: PomodoroRewardRateService, useValue: rewardRatesMock },
        { provide: SnackBarService, useValue: snackBarMock },
      ],
    });
    service = TestBed.inject(PomodoroTimerService);
    return service;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-1234-1234-1234-123456789abc');

    storageMock = {
      saveSession: vi.fn().mockResolvedValue(undefined),
      completeSession: vi.fn().mockResolvedValue(true),
      cancelSession: vi.fn().mockResolvedValue(undefined),
      getAllSessions: vi.fn().mockResolvedValue([]),
    };

    celebrationMock = {
      show: vi.fn().mockReturnValue(of('dismissed')),
    };

    rewardRatesMock = {
      getRates: vi.fn().mockResolvedValue({ [EngagementType.WORK]: 100, [EngagementType.STUDY]: 125 }),
      rates$: new BehaviorSubject<PomodoroRewardRates>({ [EngagementType.WORK]: 100, [EngagementType.STUDY]: 125 }),
    };

    snackBarMock = {
      show: vi.fn(),
      error: vi.fn(),
    };

    service = createService([]);
    // Let the startup restore finish; Start is ignored until it has.
    await vi.advanceTimersByTimeAsync(0);
  });

  afterEach(() => {
    service.ngOnDestroy();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('replacement hold', () => {
    it('drains delayed completion and startup recovery before releasing a hold', async () => {
      let finishNotification!: () => void;
      const notification = vi.spyOn(TestBed.inject(BrowserNotificationService), 'show').mockReturnValueOnce(
        new Promise<void>((resolve) => {
          finishNotification = resolve;
        }),
      );
      await service.startTimer();
      let resolveRates!: (value: PomodoroRewardRates) => void;
      rewardRatesMock.getRates.mockReturnValueOnce(
        new Promise<PomodoroRewardRates>((resolve) => {
          resolveRates = resolve;
        }),
      );
      await vi.advanceTimersByTimeAsync(1_500_000);
      let acquired = false;
      const holding = service.holdForReplacement().then((hold) => {
        acquired = true;
        return hold;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(acquired).toBe(false);
      resolveRates({ work: 100, study: 125 });
      await vi.advanceTimersByTimeAsync(0);
      expect(notification).toHaveBeenCalledTimes(1);
      expect(acquired).toBe(false);
      finishNotification();
      const hold = await holding;
      hold.commit();
      const calls = storageMock.completeSession.mock.calls.length;
      await vi.advanceTimersByTimeAsync(60_000);
      expect(storageMock.completeSession.mock.calls.length).toBe(calls);
      expect(notification).toHaveBeenCalledTimes(1);
      expect(service.currentSessionId()).toBeNull();

      let resolveRecovery!: (rows: PomodoroSession[]) => void;
      createService(
        new Promise<PomodoroSession[]>((resolve) => {
          resolveRecovery = resolve;
        }),
      );
      const recoveryHold = service.holdForReplacement();
      resolveRecovery([]);
      const recovered = await recoveryHold;
      recovered.commit();
      expect(service.isRestoring()).toBe(false);
    });

    it('preserves the timer while held and resumes its original deadline on rollback', async () => {
      await service.startTimer();
      const id = service.currentSessionId();
      const hold = await service.holdForReplacement();
      await vi.advanceTimersByTimeAsync(10_000);
      await service.stopTimer();
      expect(service.currentSessionId()).toBe(id);
      expect(storageMock.cancelSession).not.toHaveBeenCalled();
      hold.release();
      await vi.advanceTimersByTimeAsync(1000);
      expect(service.timeRemaining()).toBe(1489);
    });
    it('resets only memory on commit, blocking old completion and same-id cancellation', async () => {
      await service.startTimer();
      const hold = await service.holdForReplacement();
      hold.commit();
      await service.stopTimer();
      await vi.advanceTimersByTimeAsync(1_600_000);
      expect(service.isActive()).toBe(false);
      expect(storageMock.cancelSession).not.toHaveBeenCalled();
      expect(storageMock.completeSession).not.toHaveBeenCalled();
    });
    it('drains delayed session starts before allowing replacement', async () => {
      let resolve!: () => void;
      storageMock.saveSession.mockReturnValueOnce(
        new Promise<void>((done) => {
          resolve = done;
        }),
      );
      const starting = service.startTimer();
      let held = false;
      const holding = service.holdForReplacement().then((value) => {
        held = true;
        return value;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(held).toBe(false);
      resolve();
      await starting;
      const hold = await holding;
      hold.commit();
      expect(service.currentSessionId()).toBeNull();
    });
  });

  describe('Initial State and Configuration', () => {
    it('should initialize with default 25 minutes and WORK engagement type', () => {
      expect(service.durationMinutes()).toBe(25);
      expect(service.engagementType()).toBe(EngagementType.WORK);
      expect(service.isActive()).toBe(false);
      expect(service.timeRemaining()).toBe(1500);
      expect(service.currentSessionId()).toBeNull();
    });

    it('should update config when timer is not active', () => {
      const config: TimerConfig = {
        durationMinutes: 50,
        engagementType: EngagementType.STUDY,
      };

      service.setConfig(config);

      expect(service.durationMinutes()).toBe(50);
      expect(service.engagementType()).toBe(EngagementType.STUDY);
      expect(service.timeRemaining()).toBe(50 * 60);
    });

    it('should not update config when timer is currently active', async () => {
      await service.startTimer();

      const newConfig: TimerConfig = {
        durationMinutes: 50,
        engagementType: EngagementType.STUDY,
      };

      service.setConfig(newConfig);

      expect(service.durationMinutes()).toBe(25);
      expect(service.engagementType()).toBe(EngagementType.WORK);
    });
  });

  describe('Timer Lifecycle: Start, Tick, Stop, Complete', () => {
    it('should start timer, set state to active, and persist active session', async () => {
      await service.startTimer();

      expect(service.isActive()).toBe(true);
      expect(service.currentSessionId()).toBe('12345678-1234-1234-1234-123456789abc');
      expect(storageMock.saveSession.mock.calls.map((call: unknown[]) => call[0])).toContainEqual(
        expect.objectContaining({
          id: '12345678-1234-1234-1234-123456789abc',
          durationMinutes: 25,
          engagementType: EngagementType.WORK,
          status: PomodoroSessionStatus.ACTIVE,
        }),
      );
    });

    it('should decrement remaining time with each second tick', async () => {
      await service.startTimer();

      await vi.advanceTimersByTimeAsync(5000); // 5 seconds

      expect(service.timeRemaining()).toBe(1500 - 5);
    });

    it('should stop and cancel running timer without granting rewards', async () => {
      await service.startTimer();
      await vi.advanceTimersByTimeAsync(10000);

      await service.stopTimer();

      expect(service.isActive()).toBe(false);
      expect(service.currentSessionId()).toBeNull();
      expect(service.timeRemaining()).toBe(1500);
      expect(storageMock.cancelSession.mock.calls.map((call: unknown[]) => call.slice(0, 1))).toContainEqual([
        '12345678-1234-1234-1234-123456789abc',
      ]);
      expect(storageMock.completeSession).not.toHaveBeenCalled();
      expect(celebrationMock.show).not.toHaveBeenCalled();
    });

    it('should complete timer when countdown reaches zero, credit the reward and celebrate it', async () => {
      await service.startTimer();

      // Fast forward full 25 minutes (1500 seconds)
      await vi.advanceTimersByTimeAsync(1500 * 1000);

      expect(service.isActive()).toBe(false);
      // 25 min work session = 100 ₴ (1.0x base)
      expect(storageMock.completeSession.mock.calls.map((call: unknown[]) => call.slice(0, 2))).toContainEqual([
        '12345678-1234-1234-1234-123456789abc',
        100,
      ]);
      expect(celebrationMock.show).toHaveBeenCalledWith(expect.objectContaining({ amount: 100 }));
    });

    it('should pay the rate that is set when the session completes', async () => {
      await service.startTimer();
      rewardRatesMock.getRates.mockResolvedValue({ [EngagementType.WORK]: 40, [EngagementType.STUDY]: 125 });

      await vi.advanceTimersByTimeAsync(1500 * 1000);

      expect(storageMock.completeSession.mock.calls.map((call: unknown[]) => call.slice(0, 2))).toContainEqual([
        '12345678-1234-1234-1234-123456789abc',
        40,
      ]);
    });
  });

  describe('Completion that another path already settled', () => {
    it('should not celebrate when the session was no longer active', async () => {
      storageMock.completeSession.mockResolvedValue(false);
      await service.startTimer();

      await vi.advanceTimersByTimeAsync(1500 * 1000);

      expect(service.isActive()).toBe(false);
      expect(celebrationMock.show).not.toHaveBeenCalled();
    });
  });

  describe('Session Restoration on Startup', () => {
    it('should ignore Start until the running session has been restored', async () => {
      let finishLoading: (sessions: PomodoroSession[]) => void = () => undefined;
      service = createService(
        new Promise<PomodoroSession[]>((resolve) => {
          finishLoading = resolve;
        }),
      );
      expect(service.isRestoring()).toBe(true);

      await service.startTimer();
      expect(storageMock.saveSession).not.toHaveBeenCalled();

      finishLoading([]);
      await vi.advanceTimersByTimeAsync(0);
      await service.startTimer();

      expect(service.isRestoring()).toBe(false);
      expect(storageMock.saveSession).toHaveBeenCalledTimes(1);
    });

    it('should cancel older sessions left active next to the one it restores', async () => {
      const now = Date.now();
      const newest: PomodoroSession = {
        id: 'newest',
        durationMinutes: 25,
        engagementType: EngagementType.WORK,
        startTime: now - 60 * 1000,
        status: PomodoroSessionStatus.ACTIVE,
      };
      const orphaned: PomodoroSession = { ...newest, id: 'orphaned', startTime: now - 5 * 60 * 1000 };

      service = createService([newest, orphaned]);
      await vi.advanceTimersByTimeAsync(0);

      expect(service.currentSessionId()).toBe('newest');
      expect(storageMock.cancelSession.mock.calls.map((call: unknown[]) => call.slice(0, 1))).toContainEqual([
        'orphaned',
      ]);
      expect(storageMock.cancelSession).not.toHaveBeenCalledWith('newest');
    });

    it('should restore active session and resume countdown when remaining time is positive', async () => {
      const now = Date.now();
      const activeSession: PomodoroSession = {
        id: 'restored-session-1',
        durationMinutes: 25,
        engagementType: EngagementType.WORK,
        startTime: now - 5 * 60 * 1000, // started 5 mins ago
        status: PomodoroSessionStatus.ACTIVE,
      };

      service = createService([activeSession]);
      await vi.advanceTimersByTimeAsync(0);

      expect(service.isActive()).toBe(true);
      expect(service.currentSessionId()).toBe('restored-session-1');
      expect(service.timeRemaining()).toBe(20 * 60);

      // Verify timer continues to tick
      await vi.advanceTimersByTimeAsync(2000);
      expect(service.timeRemaining()).toBe(20 * 60 - 2);
    });

    it('should auto-complete session when restored active session has already expired', async () => {
      const now = Date.now();
      const expiredSession: PomodoroSession = {
        id: 'expired-session-1',
        durationMinutes: 25,
        engagementType: EngagementType.WORK,
        startTime: now - 30 * 60 * 1000, // started 30 mins ago for 25 min duration
        status: PomodoroSessionStatus.ACTIVE,
      };

      service = createService([expiredSession]);
      await vi.advanceTimersByTimeAsync(0);

      expect(service.isActive()).toBe(false);
      expect(storageMock.completeSession.mock.calls.map((call: unknown[]) => call.slice(0, 2))).toContainEqual([
        'expired-session-1',
        100,
      ]);
      expect(celebrationMock.show).toHaveBeenCalledWith(expect.objectContaining({ amount: 100 }));
    });
  });

  describe('Visibility Change (Background Sync)', () => {
    it('should synchronize elapsed time when tab returns from background to visible', async () => {
      await service.startTimer();

      // Tab goes to background
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // 10 minutes pass while tab is in background
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

      // Tab returns to foreground
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(service.isActive()).toBe(true);
      expect(service.timeRemaining()).toBe(15 * 60);
    });

    it('should complete session if timer expired while tab was in background', async () => {
      await service.startTimer();

      // Tab goes to background
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // 26 minutes pass (timer duration is 25 minutes)
      await vi.advanceTimersByTimeAsync(26 * 60 * 1000);

      // Tab returns to foreground
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(service.isActive()).toBe(false);
      expect(storageMock.completeSession.mock.calls.map((call: unknown[]) => call.slice(0, 2))).toContainEqual([
        '12345678-1234-1234-1234-123456789abc',
        100,
      ]);
      expect(celebrationMock.show).toHaveBeenCalledWith(expect.objectContaining({ amount: 100 }));
    });
  });

  describe('Reward Calculation Tiers', () => {
    it('should calculate Tier 1 (15-24 min) reward: 0.5x base', async () => {
      service.setConfig({
        durationMinutes: 20,
        engagementType: EngagementType.WORK,
      });
      await service.startTimer();
      await vi.advanceTimersByTimeAsync(20 * 60 * 1000);

      // Math.trunc(100 * 0.5) = 50
      expect(storageMock.completeSession.mock.calls.map((call: unknown[]) => call.slice(0, 2))).toContainEqual([
        '12345678-1234-1234-1234-123456789abc',
        50,
      ]);
    });

    it('should calculate Tier 1 (15-24 min) study reward: 0.5x base', async () => {
      service.setConfig({
        durationMinutes: 20,
        engagementType: EngagementType.STUDY,
      });
      await service.startTimer();
      await vi.advanceTimersByTimeAsync(20 * 60 * 1000);

      // Math.trunc(125 * 0.5) = 62
      expect(storageMock.completeSession.mock.calls.map((call: unknown[]) => call.slice(0, 2))).toContainEqual([
        '12345678-1234-1234-1234-123456789abc',
        62,
      ]);
    });

    it('should calculate Tier 3 (50-75 min) reward: 2.0x base', async () => {
      service.setConfig({
        durationMinutes: 60,
        engagementType: EngagementType.WORK,
      });
      await service.startTimer();
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

      // Math.trunc(100 * 2.0) = 200
      expect(storageMock.completeSession.mock.calls.map((call: unknown[]) => call.slice(0, 2))).toContainEqual([
        '12345678-1234-1234-1234-123456789abc',
        200,
      ]);
    });

    it('should calculate Tier 4 (80-120 min) reward: 3.0x base', async () => {
      service.setConfig({
        durationMinutes: 90,
        engagementType: EngagementType.STUDY,
      });
      await service.startTimer();
      await vi.advanceTimersByTimeAsync(90 * 60 * 1000);

      // Math.trunc(125 * 3.0) = 375
      expect(storageMock.completeSession.mock.calls.map((call: unknown[]) => call.slice(0, 2))).toContainEqual([
        '12345678-1234-1234-1234-123456789abc',
        375,
      ]);
    });
  });

  describe('Reward of the configured session', () => {
    it('should follow the duration and engagement type before Start', () => {
      expect(service.reward()).toBe(100);

      service.setConfig({ durationMinutes: 50, engagementType: EngagementType.WORK });
      expect(service.reward()).toBe(200);

      service.setConfig({ durationMinutes: 50, engagementType: EngagementType.STUDY });
      expect(service.reward()).toBe(250);
    });

    it('should follow a rate changed in Settings', () => {
      rewardRatesMock.rates$.next({ [EngagementType.WORK]: 40, [EngagementType.STUDY]: 125 });

      expect(service.reward()).toBe(40);
    });

    it('should stay undefined until the rates have loaded', () => {
      rewardRatesMock.rates$ = new Subject<PomodoroRewardRates>();
      service = createService([]);

      expect(service.reward()).toBeUndefined();

      rewardRatesMock.rates$.next({ [EngagementType.WORK]: 100, [EngagementType.STUDY]: 125 });
      expect(service.reward()).toBe(100);
    });

    it('should match what the session pays when it completes', async () => {
      service.setConfig({ durationMinutes: 15, engagementType: EngagementType.STUDY });
      const shown = service.reward();

      await service.startTimer();
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

      expect(storageMock.completeSession.mock.calls.map((call: unknown[]) => call.slice(0, 2))).toContainEqual([
        '12345678-1234-1234-1234-123456789abc',
        shown,
      ]);
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should clear timer interval and stop countdown when destroyed', async () => {
      await service.startTimer();
      expect(service.isActive()).toBe(true);

      service.ngOnDestroy();

      const timeAtDestroy = service.timeRemaining();
      await vi.advanceTimersByTimeAsync(5000);

      expect(service.timeRemaining()).toBe(timeAtDestroy);
    });

    it('should remove visibilitychange event listener on destroy', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      service.ngOnDestroy();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Error Handling and Robustness', () => {
    it('should reset timer and rethrow error if saving session fails during startTimer', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const testError = new Error('Database write error');
      storageMock.saveSession.mockRejectedValue(testError);

      await expect(service.startTimer()).rejects.toThrow(testError);
      expect(service.isActive()).toBe(false);
      expect(service.currentSessionId()).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to start pomodoro timer session:', testError);
      consoleSpy.mockRestore();
    });

    it('should reset timer and rethrow error if cancelling the session fails during stopTimer', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const testError = new Error('Database update error');
      storageMock.cancelSession.mockRejectedValue(testError);

      await service.startTimer();
      expect(service.isActive()).toBe(true);

      await expect(service.stopTimer()).rejects.toThrow(testError);
      expect(service.isActive()).toBe(false);
      expect(service.currentSessionId()).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to stop pomodoro timer session:', testError);
      consoleSpy.mockRestore();
    });

    it('should catch error gracefully if completing the session fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const testError = new Error('Database complete error');
      storageMock.completeSession.mockRejectedValue(testError);

      await service.startTimer();
      await vi.advanceTimersByTimeAsync(1500 * 1000);

      expect(service.isActive()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to complete pomodoro session:', testError);
      expect(snackBarMock.error).toHaveBeenCalledWith(testError, 'Failed to save completed session reward.');
      consoleSpy.mockRestore();
    });

    it('should fall back to default base reward if rate lookup lacks engagement type', async () => {
      rewardRatesMock.getRates.mockResolvedValue({});

      await service.startTimer();
      await vi.advanceTimersByTimeAsync(1500 * 1000);

      expect(storageMock.completeSession.mock.calls.map((call: unknown[]) => call.slice(0, 2))).toContainEqual([
        '12345678-1234-1234-1234-123456789abc',
        100,
      ]);
    });

    it('should catch error gracefully if getAllSessions fails on startup', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const testError = new Error('Failed to load sessions');

      TestBed.resetTestingModule();
      storageMock.getAllSessions.mockRejectedValue(testError);
      TestBed.configureTestingModule({
        providers: [
          PomodoroTimerService,
          { provide: PomodoroStorageService, useValue: storageMock },
          { provide: CelebrationService, useValue: celebrationMock },
          { provide: SnackBarService, useValue: snackBarMock },
        ],
      });
      const failingService = TestBed.inject(PomodoroTimerService);
      await vi.advanceTimersByTimeAsync(0);

      expect(failingService.isActive()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to restore active session:', testError);
      failingService.ngOnDestroy();
      consoleSpy.mockRestore();
    });
  });
});
