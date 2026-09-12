import { Service, signal, OnDestroy, inject, DestroyRef } from '@angular/core';
import { EventBusService, EVENT_TYPE } from '../../../core/services/event-bus.service';
import { PomodoroStorageService } from './pomodoro-storage.service';
import { PomodoroSession } from '../models/pomodoro-session.model';
import { EngagementType } from '../models/engagement-type.enum';
import { PomodoroSessionStatus } from '../models/pomodoro-session-status.enum';
import { MatDialog } from '@angular/material/dialog';
import { CompletionDialog } from '../components/completion-dialog/completion-dialog';
import { TimerConfig } from '../models/timer-config.model';

export type { TimerConfig };

declare class TimestampTrigger {
  constructor(timestamp: number);
}

const DEFAULT_DURATION_MINUTES = 25;
const SECONDS_IN_MINUTE = 60;
const MILLISECONDS_IN_SECOND = 1000;
const TIMER_INTERVAL_MS = 1000;

const BASE_REWARD_WORK = 25;
const BASE_REWARD_STUDY = 20;

const DURATION_TIER_1_MIN = 15;
const DURATION_TIER_2_MIN = 25;
const DURATION_TIER_3_MIN = 50;
const DURATION_TIER_4_MIN = 80;

const MULTIPLIER_TIER_1 = 0.5;
const MULTIPLIER_TIER_2 = 1;
const MULTIPLIER_TIER_3 = 2;
const MULTIPLIER_TIER_4 = 3;

const EVENT_SOURCE_POMODORO = 'pomodoro';
const NOTIFICATION_TITLE = 'Pomodoro Completed!';
const NOTIFICATION_ICON_PATH = '/assets/icons/icon-192x192.png';
const EVENT_VISIBILITY_CHANGE = 'visibilitychange';
const VISIBILITY_STATE_VISIBLE = 'visible';
const PERMISSION_DEFAULT = 'default';
const PERMISSION_GRANTED = 'granted';

@Service()
export class PomodoroTimerService implements OnDestroy {
  durationMinutes = signal<number>(DEFAULT_DURATION_MINUTES);
  engagementType = signal<EngagementType>(EngagementType.WORK);

  isActive = signal<boolean>(false);
  timeRemaining = signal<number>(DEFAULT_DURATION_MINUTES * SECONDS_IN_MINUTE);
  currentSessionId = signal<string | null>(null);

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private expectedEndTime = 0;
  private backgroundTimeStart: number | null = null;
  private isDestroyed = false;

  private eventBus = inject(EventBusService);
  private storage = inject(PomodoroStorageService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  constructor() {
    void this.restoreActiveSession();
    void this.requestNotificationPermission();

    if (typeof document !== 'undefined') {
      document.addEventListener(EVENT_VISIBILITY_CHANGE, this.handleVisibilityChange);
    }

    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    this.isDestroyed = true;
    this.clearInterval();
    if (typeof document !== 'undefined') {
      document.removeEventListener(EVENT_VISIBILITY_CHANGE, this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = (): void => {
    if (this.isDestroyed) {
      return;
    }

    if (document.visibilityState === VISIBILITY_STATE_VISIBLE) {
      void this.cancelScheduledNotifications();
      if (this.backgroundTimeStart && this.isActive()) {
        const remaining = Math.round((this.expectedEndTime - Date.now()) / MILLISECONDS_IN_SECOND);
        if (remaining <= 0) {
          this.timeRemaining.set(0);
          this.triggerCompleteSession();
        } else {
          this.timeRemaining.set(remaining);
        }
        this.backgroundTimeStart = null;
      }
    } else {
      if (this.isActive()) {
        this.backgroundTimeStart = Date.now();
        const reward = this.calculateReward(this.durationMinutes(), this.engagementType());
        void this.scheduleNotification(NOTIFICATION_TITLE, `You earned ${reward} points for your ${this.engagementType()} session.`, this.expectedEndTime);
      }
    }
  };

  setConfig(config: TimerConfig): void {
    if (this.isActive()) return;
    this.durationMinutes.set(config.durationMinutes);
    this.engagementType.set(config.engagementType);
    this.timeRemaining.set(config.durationMinutes * SECONDS_IN_MINUTE);
  }

  async startTimer(): Promise<void> {
    if (this.isActive()) return;

    const id = crypto.randomUUID();
    this.currentSessionId.set(id);
    this.isActive.set(true);

    this.expectedEndTime = Date.now() + this.timeRemaining() * MILLISECONDS_IN_SECOND;

    const session: PomodoroSession = {
      id,
      durationMinutes: this.durationMinutes(),
      engagementType: this.engagementType(),
      startTime: Date.now(),
      status: PomodoroSessionStatus.ACTIVE,
    };

    try {
      await this.storage.saveSession(session);
      this.startInterval();
    } catch (error) {
      console.error('Failed to start pomodoro timer session:', error);
      this.resetTimer();
      throw error;
    }
  }

  async stopTimer(): Promise<void> {
    if (!this.isActive()) return;
    this.clearInterval();

    const id = this.currentSessionId();
    try {
      if (id) {
        await this.storage.updateSession(id, {
          status: PomodoroSessionStatus.CANCELLED,
          endTime: Date.now(),
        });
      }
    } catch (error) {
      console.error('Failed to stop pomodoro timer session:', error);
      throw error;
    } finally {
      this.resetTimer();
    }
  }

  private startInterval(): void {
    this.clearInterval();
    if (this.isDestroyed) {
      return;
    }
    this.timerInterval = setInterval(() => {
      const remaining = Math.round((this.expectedEndTime - Date.now()) / MILLISECONDS_IN_SECOND);

      if (remaining <= 0) {
        this.timeRemaining.set(0);
        this.triggerCompleteSession();
      } else {
        this.timeRemaining.set(remaining);
      }
    }, TIMER_INTERVAL_MS);
  }

  private triggerCompleteSession(): void {
    void this.completeSession();
  }

  private clearInterval(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private async completeSession(): Promise<void> {
    this.clearInterval();
    const id = this.currentSessionId();
    if (!id) return;

    try {
      const reward = this.calculateReward(this.durationMinutes(), this.engagementType());

      await this.storage.updateSession(id, {
        status: PomodoroSessionStatus.COMPLETED,
        endTime: Date.now(),
        rewardEarned: reward,
      });

      this.completeTimer(reward);

      void this.showNotification(NOTIFICATION_TITLE, `You earned ${reward}₴ for your ${this.engagementType()} session.`);

      this.dialog.open(CompletionDialog, {
        data: {
          reward,
          engagementType: this.engagementType(),
        },
      });
    } catch (err: unknown) {
      console.error('Failed to complete pomodoro session:', err);
    } finally {
      this.resetTimer();
    }
  }

  completeTimer(rewardPoints: number): void {
    this.eventBus.emit({
      type: EVENT_TYPE.REWARD_EARNED,
      payload: { points: rewardPoints },
      source: EVENT_SOURCE_POMODORO,
    });
  }

  private resetTimer(): void {
    this.clearInterval();
    this.isActive.set(false);
    this.currentSessionId.set(null);
    this.timeRemaining.set(this.durationMinutes() * SECONDS_IN_MINUTE);
  }

  private calculateReward(duration: number, type: EngagementType): number {
    const base = type === EngagementType.WORK ? BASE_REWARD_WORK : BASE_REWARD_STUDY;
    let multiplier = 0;

    if (duration >= DURATION_TIER_1_MIN && duration < DURATION_TIER_2_MIN) {
      multiplier = MULTIPLIER_TIER_1;
    } else if (duration >= DURATION_TIER_2_MIN && duration < DURATION_TIER_3_MIN) {
      multiplier = MULTIPLIER_TIER_2;
    } else if (duration >= DURATION_TIER_3_MIN && duration < DURATION_TIER_4_MIN) {
      multiplier = MULTIPLIER_TIER_3;
    } else if (duration >= DURATION_TIER_4_MIN) {
      multiplier = MULTIPLIER_TIER_4;
    }

    return Math.trunc(base * multiplier);
  }

  private async restoreActiveSession(): Promise<void> {
    try {
      const sessions = await this.storage.getAllSessions();
      if (this.isDestroyed) {
        return;
      }
      const active = sessions.find(s => s.status === PomodoroSessionStatus.ACTIVE);

      if (active) {
        const expectedEnd = active.startTime + (active.durationMinutes * SECONDS_IN_MINUTE * MILLISECONDS_IN_SECOND);
        const remaining = Math.round((expectedEnd - Date.now()) / MILLISECONDS_IN_SECOND);

        this.durationMinutes.set(active.durationMinutes);
        this.engagementType.set(active.engagementType);
        this.currentSessionId.set(active.id);

        if (remaining <= 0) {
          this.expectedEndTime = expectedEnd;
          await this.completeSession();
        } else {
          this.isActive.set(true);
          this.expectedEndTime = expectedEnd;
          this.timeRemaining.set(remaining);
          this.startInterval();
        }
      }
    } catch (e) {
      console.error('Failed to restore active session:', e);
    }
  }

  private async requestNotificationPermission(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === PERMISSION_DEFAULT) {
        await Notification.requestPermission();
      }
    } catch (e) {
      console.error('Failed to request notification permission:', e);
    }
  }

  private async showNotification(title: string, body: string): Promise<void> {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== PERMISSION_GRANTED
    ) {
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.showNotification(title, {
            body,
            icon: NOTIFICATION_ICON_PATH,
          });
          return;
        }
      }
      new Notification(title, { body });
    } catch (err: unknown) {
      console.error('Failed to show notification:', err);
    }
  }

  private async scheduleNotification(title: string, body: string, timestamp: number): Promise<void> {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== PERMISSION_GRANTED ||
      !('showTrigger' in Notification.prototype) ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: NOTIFICATION_ICON_PATH,
          showTrigger: new TimestampTrigger(timestamp),
        } as NotificationOptions);
      }
    } catch (err: unknown) {
      console.error('Failed to schedule notification:', err);
    }
  }

  private async cancelScheduledNotifications(): Promise<void> {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.getNotifications) {
        const notifications = await reg.getNotifications();
        notifications.forEach(n => {
          n.close();
        });
      }
    } catch (err: unknown) {
      console.error('Failed to cancel scheduled notifications:', err);
    }
  }
}
