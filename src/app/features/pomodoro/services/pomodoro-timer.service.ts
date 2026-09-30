import type { OnDestroy } from '@angular/core';
import { Service, signal, inject, DestroyRef } from '@angular/core';
import { PomodoroStorageService } from './pomodoro-storage.service';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import { CelebrationService } from '../../../shared/services/celebration.service';
import { BrowserNotificationService } from '../../../core/services/browser-notification.service';
import { MONEY_FORMAT } from '../../../shared/constants/money-format.const';
import type { TimerConfig } from '../models/timer-config.model';

export type { TimerConfig };

const DEFAULT_DURATION_MINUTES = 25;

const BASE_REWARD_WORK = 25;
const BASE_REWARD_STUDY = 20;

// Checked top-down: the first tier whose minimum the session reaches sets the multiplier.
const REWARD_TIERS: readonly { minMinutes: number; multiplier: number }[] = [
  { minMinutes: 80, multiplier: 3 },
  { minMinutes: 50, multiplier: 2 },
  { minMinutes: 25, multiplier: 1 },
  { minMinutes: 15, multiplier: 0.5 },
];

const COMPLETION_TITLE = 'Pomodoro complete';

@Service()
export class PomodoroTimerService implements OnDestroy {
  durationMinutes = signal<number>(DEFAULT_DURATION_MINUTES);
  engagementType = signal<EngagementType>(EngagementType.WORK);

  isActive = signal<boolean>(false);
  // True until the session left running before a reload has been restored; Start waits for it.
  isRestoring = signal<boolean>(true);
  timeRemaining = signal<number>(DEFAULT_DURATION_MINUTES * 60);
  currentSessionId = signal<string | null>(null);

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private expectedEndTime = 0;
  private backgroundTimeStart: number | null = null;
  private isDestroyed = false;

  private storage = inject(PomodoroStorageService);
  private celebration = inject(CelebrationService);
  private notifications = inject(BrowserNotificationService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    void this.restoreActiveSession();
    void this.requestNotificationPermission();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
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
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = (): void => {
    if (this.isDestroyed) {
      return;
    }

    if (document.visibilityState === 'visible') {
      void this.cancelScheduledNotifications();
      if (this.backgroundTimeStart && this.isActive()) {
        const remaining = Math.round((this.expectedEndTime - Date.now()) / 1000);
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
        void this.scheduleNotification(COMPLETION_TITLE, this.rewardMessage(reward), this.expectedEndTime);
      }
    }
  };

  setConfig(config: TimerConfig): void {
    if (this.isActive()) return;
    this.durationMinutes.set(config.durationMinutes);
    this.engagementType.set(config.engagementType);
    this.timeRemaining.set(config.durationMinutes * 60);
  }

  async startTimer(): Promise<void> {
    if (this.isActive() || this.isRestoring()) return;

    const id = crypto.randomUUID();
    this.currentSessionId.set(id);
    this.isActive.set(true);

    this.expectedEndTime = Date.now() + this.timeRemaining() * 1000;

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
        await this.storage.cancelSession(id);
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
      const remaining = Math.round((this.expectedEndTime - Date.now()) / 1000);

      if (remaining <= 0) {
        this.timeRemaining.set(0);
        this.triggerCompleteSession();
      } else {
        this.timeRemaining.set(remaining);
      }
    }, 1000);
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
      if (!(await this.storage.completeSession(id, reward))) return;

      this.notifications
        .show(COMPLETION_TITLE, { body: this.rewardMessage(reward), icon: 'icons/icon-192x192.png' })
        .catch((err: unknown) => {
          console.error('Failed to show notification:', err);
        });

      this.celebration
        .show({
          title: COMPLETION_TITLE,
          subtitle: `Great job focusing on your ${this.engagementType()} session.`,
          amount: reward,
        })
        .subscribe();
    } catch (err: unknown) {
      console.error('Failed to complete pomodoro session:', err);
    } finally {
      this.resetTimer();
    }
  }

  private resetTimer(): void {
    this.clearInterval();
    this.isActive.set(false);
    this.currentSessionId.set(null);
    this.timeRemaining.set(this.durationMinutes() * 60);
  }

  private calculateReward(duration: number, type: EngagementType): number {
    const base = type === EngagementType.WORK ? BASE_REWARD_WORK : BASE_REWARD_STUDY;
    const multiplier = REWARD_TIERS.find((tier) => duration >= tier.minMinutes)?.multiplier ?? 0;
    return Math.trunc(base * multiplier);
  }

  private rewardMessage(reward: number): string {
    return `You earned ${MONEY_FORMAT.format(reward)} ₴ for your ${this.engagementType()} session.`;
  }

  private async restoreActiveSession(): Promise<void> {
    try {
      const sessions = await this.storage.getAllSessions();
      if (this.isDestroyed) {
        return;
      }
      const activeSessions = sessions.filter((s) => s.status === PomodoroSessionStatus.ACTIVE);
      const active = activeSessions.at(0);
      const orphaned = activeSessions.slice(1);

      if (active) {
        const expectedEnd = active.startTime + active.durationMinutes * 60 * 1000;
        const remaining = Math.round((expectedEnd - Date.now()) / 1000);

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

      // Only one session runs at a time. An older active row never ran as a timer (it was started
      // while an earlier restore was still loading), so it is cancelled rather than paid out later.
      for (const session of orphaned) {
        await this.storage.cancelSession(session.id);
      }
    } catch (e) {
      console.error('Failed to restore active session:', e);
    } finally {
      this.isRestoring.set(false);
    }
  }

  private async requestNotificationPermission(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch (e) {
      console.error('Failed to request notification permission:', e);
    }
  }

  private async scheduleNotification(title: string, body: string, timestamp: number): Promise<void> {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'granted' ||
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
          icon: 'icons/icon-192x192.png',
          showTrigger: new TimestampTrigger(timestamp),
        } as NotificationOptions);
      }
    } catch (err: unknown) {
      console.error('Failed to schedule notification:', err);
    }
  }

  private async cancelScheduledNotifications(): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.getNotifications) {
        const notifications = await reg.getNotifications();
        notifications.forEach((n) => {
          n.close();
        });
      }
    } catch (err: unknown) {
      console.error('Failed to cancel scheduled notifications:', err);
    }
  }
}
