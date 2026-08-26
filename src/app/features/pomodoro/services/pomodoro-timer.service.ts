import { Injectable, signal, OnDestroy, inject } from '@angular/core';
import { EventBusService } from '../../../core/services/event-bus.service';
import { PomodoroStorageService } from './pomodoro-storage.service';
import { EngagementType, PomodoroSession } from '../models/pomodoro-session.model';
import { MatDialog } from '@angular/material/dialog';
import { CompletionDialog } from '../components/completion-dialog/completion-dialog';

export interface TimerConfig {
  durationMinutes: number;
  engagementType: EngagementType;
}

@Injectable({
  providedIn: 'root'
})
export class PomodoroTimerService implements OnDestroy {
  // Config
  durationMinutes = signal<number>(25);
  engagementType = signal<EngagementType>('work');

  // State
  isActive = signal<boolean>(false);
  timeRemaining = signal<number>(25 * 60);
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
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  ngOnDestroy() {
    this.clearInterval();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.cancelScheduledNotifications();
      if (this.backgroundTimeStart && this.isActive()) {
        const remaining = Math.round((this.expectedEndTime - Date.now()) / 1000);
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
        this.scheduleNotification('Pomodoro Completed!', `You earned ${reward} points for your ${this.engagementType()} session.`, this.expectedEndTime);
      }
    }
  };

  setConfig(config: TimerConfig) {
    if (this.isActive()) return;
    this.durationMinutes.set(config.durationMinutes);
    this.engagementType.set(config.engagementType);
    this.timeRemaining.set(config.durationMinutes * 60);
  }

  async startTimer() {
    if (this.isActive()) return;
    
    const id = crypto.randomUUID();
    this.currentSessionId.set(id);
    this.isActive.set(true);
    
    this.expectedEndTime = Date.now() + this.timeRemaining() * 1000;
    
    const session: PomodoroSession = {
      id,
      durationMinutes: this.durationMinutes(),
      engagementType: this.engagementType(),
      startTime: Date.now(),
      status: 'active'
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
        status: 'cancelled',
        endTime: Date.now()
      });
    }
    
    this.resetTimer();
  }

  private startInterval() {
    this.clearInterval();
    this.timerInterval = setInterval(() => {
      const remaining = Math.round((this.expectedEndTime - Date.now()) / 1000);
      
      if (remaining <= 0) {
        this.timeRemaining.set(0);
        this.completeSession();
      } else {
        this.timeRemaining.set(remaining);
      }
    }, 1000);
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
      status: 'completed',
      endTime: Date.now(),
      rewardEarned: reward
    });

    this.completeTimer(reward);

    this.showNotification('Pomodoro Completed!', `You earned ${reward} points for your ${this.engagementType()} session.`);
    
    this.dialog.open(CompletionDialog, {
      data: {
        reward,
        engagementType: this.engagementType()
      }
    });

    this.resetTimer();
  }
  
  // F3: Emit RewardEarnedEvent on completion
  completeTimer(rewardPoints: number) {
    this.eventBus.emit({
      type: 'RewardEarned',
      payload: { points: rewardPoints },
      source: 'pomodoro'
    });
  }

  private resetTimer() {
    this.isActive.set(false);
    this.currentSessionId.set(null);
    this.timeRemaining.set(this.durationMinutes() * 60);
  }

  private calculateReward(duration: number, type: EngagementType): number {
    const base = type === 'work' ? 25 : 20;
    let multiplier = 0;
    
    if (duration >= 15 && duration <= 24) multiplier = 0.5;
    else if (duration >= 25 && duration <= 45) multiplier = 1;
    else if (duration >= 50 && duration <= 75) multiplier = 2;
    else if (duration >= 80 && duration <= 120) multiplier = 3;
    
    return Math.trunc(base * multiplier);
  }

  private async restoreActiveSession() {
    const sessions = await this.storage.getAllSessions();
    const active = sessions.find(s => s.status === 'active');
    
    if (active) {
      const expectedEnd = active.startTime + (active.durationMinutes * 60 * 1000);
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
  }

  private async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  private showNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.showNotification(title, {
            body,
            icon: '/assets/icons/icon-192x192.png'
          });
        } else {
          new Notification(title, { body });
        }
      });
    }
  }

  private scheduleNotification(title: string, body: string, timestamp: number) {
    if ('Notification' in window && Notification.permission === 'granted' && 'showTrigger' in Notification.prototype) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.showNotification(title, {
            body,
            icon: '/assets/icons/icon-192x192.png',
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
