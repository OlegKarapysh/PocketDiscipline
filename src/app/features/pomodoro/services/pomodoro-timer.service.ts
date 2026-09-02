import { Injectable, signal, OnDestroy, inject } from '@angular/core';
import { EventBusService, EVENT_TYPE } from '../../../core/services/event-bus.service';
import { PomodoroStorageService } from './pomodoro-storage.service';
import { PomodoroSession } from '../models/pomodoro-session.model';
import { EngagementType } from '../models/engagement-type.enum';
import { PomodoroSessionStatus } from '../models/pomodoro-session-status.enum';
import { MatDialog } from '@angular/material/dialog';
import { CompletionDialog } from '../components/completion-dialog/completion-dialog';

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

export interface TimerConfig {
  durationMinutes: number;
  engagementType: EngagementType;
}

@Injectable({
  providedIn: 'root'
})
export class PomodoroTimerService implements OnDestroy {
  durationMinutes = signal<number>(DEFAULT_DURATION_MINUTES);
  engagementType = signal<EngagementType>(EngagementType.WORK);

  isActive = signal<boolean>(false);
  timeRemaining = signal<number>(DEFAULT_DURATION_MINUTES * SECONDS_IN_MINUTE);
  currentSessionId = signal<string | null>(null);
  
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private expectedEndTime = 0;
  private backgroundTimeStart: number | null = null;
  
  private eventBus = inject(EventBusService);
  private storage = inject(PomodoroStorageService);
  private dialog = inject(MatDialog);

  constructor() {
    this.restoreActiveSession();
    this.requestNotificationPermission();
    document.addEventListener(EVENT_VISIBILITY_CHANGE, this.handleVisibilityChange);
  }

  ngOnDestroy() {
    this.clearInterval();
    document.removeEventListener(EVENT_VISIBILITY_CHANGE, this.handleVisibilityChange);
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === VISIBILITY_STATE_VISIBLE) {
      this.cancelScheduledNotifications();
      if (this.backgroundTimeStart && this.isActive()) {
        const remaining = Math.round((this.expectedEndTime - Date.now()) / MILLISECONDS_IN_SECOND);
        if (remaining <= 0) {
          this.timeRemaining.set(0);
          this.completeSession();
        } else {
          this.timeRemaining.set(remaining);
        }
        this.backgroundTimeStart = null;
      }
    } else {
      if (this.isActive()) {
        this.backgroundTimeStart = Date.now();
        const reward = this.calculateReward(this.durationMinutes(), this.engagementType());
        this.scheduleNotification(NOTIFICATION_TITLE, `You earned ${reward} points for your ${this.engagementType()} session.`, this.expectedEndTime);
      }
    }
  };

  setConfig(config: TimerConfig) {
    if (this.isActive()) return;
    this.durationMinutes.set(config.durationMinutes);
    this.engagementType.set(config.engagementType);
    this.timeRemaining.set(config.durationMinutes * SECONDS_IN_MINUTE);
  }

  async startTimer() {
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
      status: PomodoroSessionStatus.ACTIVE
    };
    
    await this.storage.saveSession(session);
    
    this.startInterval();
  }

  async stopTimer() {
    if (!this.isActive()) return;
    this.clearInterval();
    
    const id = this.currentSessionId();
    if (id) {
      await this.storage.updateSession(id, {
        status: PomodoroSessionStatus.CANCELLED,
        endTime: Date.now()
      });
    }
    
    this.resetTimer();
  }

  private startInterval() {
    this.clearInterval();
    this.timerInterval = setInterval(() => {
      const remaining = Math.round((this.expectedEndTime - Date.now()) / MILLISECONDS_IN_SECOND);
      
      if (remaining <= 0) {
        this.timeRemaining.set(0);
        this.completeSession();
      } else {
        this.timeRemaining.set(remaining);
      }
    }, TIMER_INTERVAL_MS);
  }

  private clearInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private async completeSession() {
    this.clearInterval();
    const id = this.currentSessionId();
    if (!id) return;

    const reward = this.calculateReward(this.durationMinutes(), this.engagementType());
    
    await this.storage.updateSession(id, {
      status: PomodoroSessionStatus.COMPLETED,
      endTime: Date.now(),
      rewardEarned: reward
    });

    this.completeTimer(reward);

    this.showNotification(NOTIFICATION_TITLE, `You earned ${reward} points for your ${this.engagementType()} session.`);
    
    this.dialog.open(CompletionDialog, {
      data: {
        reward,
        engagementType: this.engagementType()
      }
    });

    this.resetTimer();
  }
  
  completeTimer(rewardPoints: number) {
    this.eventBus.emit({
      type: EVENT_TYPE.REWARD_EARNED,
      payload: { points: rewardPoints },
      source: EVENT_SOURCE_POMODORO
    });
  }

  private resetTimer() {
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

  private async restoreActiveSession() {
    const sessions = await this.storage.getAllSessions();
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
  }

  private async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === PERMISSION_DEFAULT) {
      await Notification.requestPermission();
    }
  }

  private showNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === PERMISSION_GRANTED) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.showNotification(title, {
            body,
            icon: NOTIFICATION_ICON_PATH
          });
        } else {
          new Notification(title, { body });
        }
      });
    }
  }

  private scheduleNotification(title: string, body: string, timestamp: number) {
    if ('Notification' in window && Notification.permission === PERMISSION_GRANTED && 'showTrigger' in Notification.prototype) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.showNotification(title, {
            body,
            icon: NOTIFICATION_ICON_PATH,
            // @ts-expect-error - TimestampTrigger is an experimental API
            showTrigger: new TimestampTrigger(timestamp)
          });
        }
      });
    }
  }

  private cancelScheduledNotifications() {
    if ('Notification' in window && navigator.serviceWorker) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.getNotifications) {
          reg.getNotifications().then(notifications => {
            notifications.forEach(n => n.close());
          });
        }
      });
    }
  }
}
