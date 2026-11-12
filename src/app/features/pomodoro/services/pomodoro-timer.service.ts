import type { OnDestroy } from '@angular/core';
import { Service, computed, signal, inject, DestroyRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, from, of } from 'rxjs';
import { PomodoroStorageService } from './pomodoro-storage.service';
import { DEFAULT_RATES, PomodoroRewardRateService } from './pomodoro-reward-rate.service';
import type { PomodoroRewardRates } from '../models/pomodoro-reward-rates.type';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import { CelebrationService } from '../../../shared/services/celebration.service';
import { BrowserNotificationService } from '../../../core/services/browser-notification.service';
import { SnackBarService } from '../../../shared/services/snack-bar.service';
import { MONEY_FORMAT } from '../../../shared/constants/money-format.const';
import type { TimerConfig } from '../models/timer-config.model';

export type { TimerConfig };

const DEFAULT_DURATION_MINUTES = 25;

// Each tier multiplies the rate of a 25-minute session. Checked top-down: the first tier whose minimum the session reaches sets the multiplier.
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
  private replacementHeld = false;
  private generation = 0;
  private completingGeneration: number | undefined;
  private readonly pending = new Set<Promise<void>>();

  private storage = inject(PomodoroStorageService);
  private rewardRates = inject(PomodoroRewardRateService);
  private celebration = inject(CelebrationService);
  private notifications = inject(BrowserNotificationService);
  private snackBar = inject(SnackBarService);
  private destroyRef = inject(DestroyRef);

  // A failed read shows no reward rather than a default the user may have changed.
  private readonly rates = toSignal(
    from(this.rewardRates.rates$).pipe(
      catchError(() => {
        this.snackBar.show('Could not load your pomodoro rewards.');
        return of(undefined);
      }),
    ),
  );

  // What the configured (or running) session pays at the current rates; undefined until the rates load.
  readonly reward = computed(() => {
    const rates = this.rates();
    return rates === undefined ? undefined : this.rewardAt(rates, this.durationMinutes(), this.engagementType());
  });

  constructor() {
    void this.track(() => this.restoreActiveSession());
    void this.notifications.requestPermission();

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
    this.generation++;
    this.clearInterval();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = (): void => {
    if (this.isDestroyed || this.replacementHeld) {
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
        void this.track(() => this.scheduleCompletionNotification());
      }
    }
  };

  setConfig(config: TimerConfig): void {
    if (this.isActive() || this.replacementHeld) return;
    this.durationMinutes.set(config.durationMinutes);
    this.engagementType.set(config.engagementType);
    this.timeRemaining.set(config.durationMinutes * 60);
  }

  startTimer(): Promise<void> {
    if (this.replacementHeld || this.isDestroyed) return Promise.resolve();
    return this.track(() => this.startSession());
  }

  private async startSession(): Promise<void> {
    if (this.isActive() || this.isRestoring()) return;
    this.generation++;
    const valid = this.operationGuard();

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
      await this.storage.saveSession(session, valid);
      if (valid()) this.startInterval();
    } catch (error) {
      if (valid()) this.resetTimer();
      throw error;
    }
  }

  stopTimer(): Promise<void> {
    if (this.replacementHeld || this.isDestroyed) return Promise.resolve();
    return this.track(() => this.stopSession());
  }

  private async stopSession(): Promise<void> {
    if (!this.isActive()) return;
    const valid = this.operationGuard();
    this.clearInterval();

    const id = this.currentSessionId();
    try {
      if (id) {
        await this.storage.cancelSession(id, valid);
      }
    } finally {
      if (valid()) this.resetTimer();
    }
  }

  private startInterval(): void {
    this.clearInterval();
    if (this.isDestroyed || this.replacementHeld) {
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
    if (!this.replacementHeld && !this.isDestroyed) void this.track(() => this.completeSession());
  }

  private clearInterval(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private async completeSession(): Promise<void> {
    const generation = this.generation;
    if (this.completingGeneration === generation) return;
    const valid = this.operationGuard();
    this.clearInterval();
    const id = this.currentSessionId();
    if (!id) return;
    this.completingGeneration = generation;

    const engagementType = this.engagementType();
    const durationMinutes = this.durationMinutes();
    try {
      const reward = await this.calculateReward(durationMinutes, engagementType);
      if (!valid() || !(await this.storage.completeSession(id, reward, valid)) || !valid()) return;

      await this.notifications
        .show(COMPLETION_TITLE, this.completionNotification(reward, engagementType))
        .catch((err: unknown) => {
          console.error('Failed to show notification:', err);
        });

      if (!valid()) return;
      this.celebration
        .show({
          title: COMPLETION_TITLE,
          subtitle: `Great job focusing on your ${engagementType} session.`,
          amount: reward,
        })
        .subscribe();
    } catch (err: unknown) {
      this.snackBar.error(err, 'Failed to save completed session reward.');
    } finally {
      if (valid()) this.resetTimer();
      if (this.completingGeneration === generation) this.completingGeneration = undefined;
    }
  }

  private resetTimer(): void {
    this.clearInterval();
    this.isActive.set(false);
    this.currentSessionId.set(null);
    this.timeRemaining.set(this.durationMinutes() * 60);
  }

  private async calculateReward(duration: number, type: EngagementType): Promise<number> {
    return this.rewardAt(await this.rewardRates.getRates(), duration, type);
  }

  private rewardAt(rates: Partial<PomodoroRewardRates>, duration: number, type: EngagementType): number {
    const multiplier = REWARD_TIERS.find((tier) => duration >= tier.minMinutes)?.multiplier ?? 0;
    const base = rates[type] ?? DEFAULT_RATES[type];
    const reward = Math.trunc(base * multiplier);
    return Number.isFinite(reward) && reward >= 0 ? reward : 0;
  }

  private completionNotification(reward: number, type: EngagementType): NotificationOptions {
    return {
      body: `You earned ${MONEY_FORMAT.format(reward)} ₴ for your ${type} session.`,
      icon: 'icons/icon-192x192.png',
    };
  }

  private async restoreActiveSession(): Promise<void> {
    const valid = this.operationGuard();
    try {
      const sessions = await this.storage.getAllSessions();
      if (!valid()) {
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
        if (valid()) await this.storage.cancelSession(session.id, valid);
      }
    } catch (e) {
      console.error('Failed to restore active session:', e);
    } finally {
      if (valid()) this.isRestoring.set(false);
    }
  }

  private async scheduleCompletionNotification(): Promise<void> {
    const valid = this.operationGuard();
    // The tab may come back, and cancel the notifications, while the rate or the registration is read.
    const stillInBackground = (): boolean =>
      valid() && !this.replacementHeld && this.isActive() && document.visibilityState === 'hidden';
    try {
      const engagementType = this.engagementType();
      const reward = await this.calculateReward(this.durationMinutes(), engagementType);
      await this.notifications.schedule(
        COMPLETION_TITLE,
        this.completionNotification(reward, engagementType),
        this.expectedEndTime,
        stillInBackground,
      );
    } catch (err: unknown) {
      console.error('Failed to schedule notification:', err);
    }
  }

  private async cancelScheduledNotifications(): Promise<void> {
    try {
      await this.notifications.closeAll();
    } catch (err: unknown) {
      console.error('Failed to cancel scheduled notifications:', err);
    }
  }

  async ready(): Promise<void> {
    while (this.pending.size) await Promise.allSettled([...this.pending]);
  }

  async holdForReplacement(): Promise<{ commit: () => void; release: () => void }> {
    if (this.replacementHeld) throw new Error('A data replacement is already in progress.');
    this.replacementHeld = true;
    // Visibility events are ignored while held; release catches up on a change the hold swallowed.
    const visibilityAtHold = typeof document === 'undefined' ? undefined : document.visibilityState;
    this.clearInterval();
    await this.ready();
    let finished = false;
    return {
      commit: () => {
        if (finished) return;
        finished = true;
        this.generation++;
        this.resetTimer();
        this.backgroundTimeStart = null;
        this.isRestoring.set(false);
        this.replacementHeld = false;
        void this.cancelScheduledNotifications();
      },
      release: () => {
        if (finished) return;
        finished = true;
        this.replacementHeld = false;
        if (this.isActive()) {
          this.timeRemaining.set(Math.max(0, Math.round((this.expectedEndTime - Date.now()) / 1000)));
          this.startInterval();
        }
        if (visibilityAtHold !== undefined && document.visibilityState !== visibilityAtHold) {
          this.handleVisibilityChange();
        }
      },
    };
  }

  private operationGuard(): () => boolean {
    const generation = this.generation;
    return () => generation === this.generation && !this.isDestroyed;
  }

  private track(work: () => Promise<void>): Promise<void> {
    const operation = work();
    this.pending.add(operation);
    void operation.then(
      () => this.pending.delete(operation),
      () => this.pending.delete(operation),
    );
    return operation;
  }
}
