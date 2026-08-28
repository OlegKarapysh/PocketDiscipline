import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { PomodoroTimerService, TimerConfig } from './pomodoro-timer.service';
import { EventBusService, EVENT_TYPE } from '../../../core/services/event-bus.service';
import { PomodoroStorageService } from './pomodoro-storage.service';
import { ENGAGEMENT_TYPE, POMODORO_SESSION_STATUS } from '../models/pomodoro-session.model';

const DEFAULT_DURATION = 25;
const CUSTOM_DURATION = 50;
const TIER1_DURATION = 20;
const TIER3_DURATION = 60;
const TIER4_DURATION = 90;
const EXPECTED_INITIAL_SECONDS = 1500;
const TEST_SESSION_UUID = '12345678-1234-1234-1234-123456789abc';

describe('PomodoroTimerService', () => {
  let service: PomodoroTimerService;
  let eventBusMock: { emit: ReturnType<typeof vi.fn> };
  let storageMock: {
    saveSession: ReturnType<typeof vi.fn>;
    updateSession: ReturnType<typeof vi.fn>;
    getAllSessions: ReturnType<typeof vi.fn>;
  };
  let dialogMock: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(TEST_SESSION_UUID);

    eventBusMock = {
      emit: vi.fn(),
    };

    storageMock = {
      saveSession: vi.fn().mockResolvedValue(undefined),
      updateSession: vi.fn().mockResolvedValue(undefined),
      getAllSessions: vi.fn().mockResolvedValue([]),
    };

    dialogMock = {
      open: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        PomodoroTimerService,
        { provide: EventBusService, useValue: eventBusMock },
        { provide: PomodoroStorageService, useValue: storageMock },
        { provide: MatDialog, useValue: dialogMock },
      ],
    });

    service = TestBed.inject(PomodoroTimerService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Initial State and Configuration', () => {
    it('should initialize with default 25 minutes and WORK engagement type', () => {
      expect(service.durationMinutes()).toBe(DEFAULT_DURATION);
      expect(service.engagementType()).toBe(ENGAGEMENT_TYPE.WORK);
      expect(service.isActive()).toBe(false);
      expect(service.timeRemaining()).toBe(EXPECTED_INITIAL_SECONDS);
      expect(service.currentSessionId()).toBeNull();
    });

    it('should update config when timer is not active', () => {
      const config: TimerConfig = {
        durationMinutes: CUSTOM_DURATION,
        engagementType: ENGAGEMENT_TYPE.STUDY,
      };

      service.setConfig(config);

      expect(service.durationMinutes()).toBe(CUSTOM_DURATION);
      expect(service.engagementType()).toBe(ENGAGEMENT_TYPE.STUDY);
      expect(service.timeRemaining()).toBe(CUSTOM_DURATION * 60);
    });

    it('should not update config when timer is currently active', async () => {
      await service.startTimer();

      const newConfig: TimerConfig = {
        durationMinutes: CUSTOM_DURATION,
        engagementType: ENGAGEMENT_TYPE.STUDY,
      };

      service.setConfig(newConfig);

      expect(service.durationMinutes()).toBe(DEFAULT_DURATION);
      expect(service.engagementType()).toBe(ENGAGEMENT_TYPE.WORK);
    });
  });

  describe('Timer Lifecycle: Start, Tick, Stop, Complete', () => {
    it('should start timer, set state to active, and persist active session', async () => {
      await service.startTimer();

      expect(service.isActive()).toBe(true);
      expect(service.currentSessionId()).toBe(TEST_SESSION_UUID);
      expect(storageMock.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          id: TEST_SESSION_UUID,
          durationMinutes: DEFAULT_DURATION,
          engagementType: ENGAGEMENT_TYPE.WORK,
          status: POMODORO_SESSION_STATUS.ACTIVE,
        })
      );
    });

    it('should decrement remaining time with each second tick', async () => {
      await service.startTimer();

      await vi.advanceTimersByTimeAsync(5000); // 5 seconds

      expect(service.timeRemaining()).toBe(EXPECTED_INITIAL_SECONDS - 5);
    });

    it('should stop and cancel running timer without granting rewards', async () => {
      await service.startTimer();
      await vi.advanceTimersByTimeAsync(10000);

      await service.stopTimer();

      expect(service.isActive()).toBe(false);
      expect(service.currentSessionId()).toBeNull();
      expect(service.timeRemaining()).toBe(EXPECTED_INITIAL_SECONDS);
      expect(storageMock.updateSession).toHaveBeenCalledWith(
        TEST_SESSION_UUID,
        expect.objectContaining({
          status: POMODORO_SESSION_STATUS.CANCELLED,
        })
      );
      expect(eventBusMock.emit).not.toHaveBeenCalled();
      expect(dialogMock.open).not.toHaveBeenCalled();
    });

    it('should complete timer when countdown reaches zero, emit reward and open completion dialog', async () => {
      await service.startTimer();

      // Fast forward full 25 minutes (1500 seconds)
      await vi.advanceTimersByTimeAsync(1500 * 1000);

      expect(service.isActive()).toBe(false);
      expect(storageMock.updateSession).toHaveBeenCalledWith(
        TEST_SESSION_UUID,
        expect.objectContaining({
          status: POMODORO_SESSION_STATUS.COMPLETED,
          rewardEarned: 25, // 25 min work session = 25 points (1.0x base)
        })
      );
      expect(eventBusMock.emit).toHaveBeenCalledWith({
        type: EVENT_TYPE.REWARD_EARNED,
        payload: { points: 25 },
        source: 'pomodoro',
      });
      expect(dialogMock.open).toHaveBeenCalled();
    });
  });

  describe('Reward Calculation Tiers', () => {
    it('should calculate Tier 1 (15-24 min) reward: 0.5x base', async () => {
      service.setConfig({
        durationMinutes: TIER1_DURATION,
        engagementType: ENGAGEMENT_TYPE.WORK,
      });
      await service.startTimer();
      await vi.advanceTimersByTimeAsync(TIER1_DURATION * 60 * 1000);

      expect(storageMock.updateSession).toHaveBeenCalledWith(
        TEST_SESSION_UUID,
        expect.objectContaining({
          rewardEarned: 12, // Math.trunc(25 * 0.5) = 12
        })
      );
    });

    it('should calculate Tier 1 (15-24 min) study reward: 0.5x base', async () => {
      service.setConfig({
        durationMinutes: TIER1_DURATION,
        engagementType: ENGAGEMENT_TYPE.STUDY,
      });
      await service.startTimer();
      await vi.advanceTimersByTimeAsync(TIER1_DURATION * 60 * 1000);

      expect(storageMock.updateSession).toHaveBeenCalledWith(
        TEST_SESSION_UUID,
        expect.objectContaining({
          rewardEarned: 10, // Math.trunc(20 * 0.5) = 10
        })
      );
    });

    it('should calculate Tier 3 (50-75 min) reward: 2.0x base', async () => {
      service.setConfig({
        durationMinutes: TIER3_DURATION,
        engagementType: ENGAGEMENT_TYPE.WORK,
      });
      await service.startTimer();
      await vi.advanceTimersByTimeAsync(TIER3_DURATION * 60 * 1000);

      expect(storageMock.updateSession).toHaveBeenCalledWith(
        TEST_SESSION_UUID,
        expect.objectContaining({
          rewardEarned: 50, // Math.trunc(25 * 2.0) = 50
        })
      );
    });

    it('should calculate Tier 4 (80-120 min) reward: 3.0x base', async () => {
      service.setConfig({
        durationMinutes: TIER4_DURATION,
        engagementType: ENGAGEMENT_TYPE.STUDY,
      });
      await service.startTimer();
      await vi.advanceTimersByTimeAsync(TIER4_DURATION * 60 * 1000);

      expect(storageMock.updateSession).toHaveBeenCalledWith(
        TEST_SESSION_UUID,
        expect.objectContaining({
          rewardEarned: 60, // Math.trunc(20 * 3.0) = 60
        })
      );
    });
  });
});
