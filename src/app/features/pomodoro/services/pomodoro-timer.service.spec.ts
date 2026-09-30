import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import type { TimerConfig } from './pomodoro-timer.service';
import { PomodoroTimerService } from './pomodoro-timer.service';
import { PomodoroStorageService } from './pomodoro-storage.service';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import { CelebrationService } from '../../../shared/services/celebration.service';

describe('PomodoroTimerService', () => {
  let service: PomodoroTimerService;
  let storageMock: {
    saveSession: ReturnType<typeof vi.fn>;
    completeSession: ReturnType<typeof vi.fn>;
    cancelSession: ReturnType<typeof vi.fn>;
    getAllSessions: ReturnType<typeof vi.fn>;
  };
  let celebrationMock: { show: ReturnType<typeof vi.fn> };

  const createService = (sessions: PomodoroSession[] = []) => {
    TestBed.resetTestingModule();
    storageMock.getAllSessions.mockResolvedValue(sessions);
    TestBed.configureTestingModule({
      providers: [
        PomodoroTimerService,
        { provide: PomodoroStorageService, useValue: storageMock },
        { provide: CelebrationService, useValue: celebrationMock },
      ],
    });
    service = TestBed.inject(PomodoroTimerService);
    return service;
  };

  beforeEach(() => {
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

    service = createService([]);
  });

  afterEach(() => {
    service.ngOnDestroy();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.useRealTimers();
    vi.restoreAllMocks();
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
      expect(storageMock.saveSession).toHaveBeenCalledWith(
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
      expect(storageMock.cancelSession).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc');
      expect(storageMock.completeSession).not.toHaveBeenCalled();
      expect(celebrationMock.show).not.toHaveBeenCalled();
    });

    it('should complete timer when countdown reaches zero, credit the reward and celebrate it', async () => {
      await service.startTimer();

      // Fast forward full 25 minutes (1500 seconds)
      await vi.advanceTimersByTimeAsync(1500 * 1000);

      expect(service.isActive()).toBe(false);
      // 25 min work session = 25 points (1.0x base)
      expect(storageMock.completeSession).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc', 25);
      expect(celebrationMock.show).toHaveBeenCalledWith(expect.objectContaining({ amount: 25 }));
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
      expect(storageMock.completeSession).toHaveBeenCalledWith('expired-session-1', 25);
      expect(celebrationMock.show).toHaveBeenCalledWith(expect.objectContaining({ amount: 25 }));
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
      expect(storageMock.completeSession).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc', 25);
      expect(celebrationMock.show).toHaveBeenCalledWith(expect.objectContaining({ amount: 25 }));
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

      // Math.trunc(25 * 0.5) = 12
      expect(storageMock.completeSession).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc', 12);
    });

    it('should calculate Tier 1 (15-24 min) study reward: 0.5x base', async () => {
      service.setConfig({
        durationMinutes: 20,
        engagementType: EngagementType.STUDY,
      });
      await service.startTimer();
      await vi.advanceTimersByTimeAsync(20 * 60 * 1000);

      // Math.trunc(20 * 0.5) = 10
      expect(storageMock.completeSession).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc', 10);
    });

    it('should calculate Tier 3 (50-75 min) reward: 2.0x base', async () => {
      service.setConfig({
        durationMinutes: 60,
        engagementType: EngagementType.WORK,
      });
      await service.startTimer();
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

      // Math.trunc(25 * 2.0) = 50
      expect(storageMock.completeSession).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc', 50);
    });

    it('should calculate Tier 4 (80-120 min) reward: 3.0x base', async () => {
      service.setConfig({
        durationMinutes: 90,
        engagementType: EngagementType.STUDY,
      });
      await service.startTimer();
      await vi.advanceTimersByTimeAsync(90 * 60 * 1000);

      // Math.trunc(20 * 3.0) = 60
      expect(storageMock.completeSession).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc', 60);
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
      consoleSpy.mockRestore();
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
