import { Injectable, inject } from '@angular/core';
import { DailyScoresService } from '../../features/daily-scores/services/daily-scores.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private dailyScoresService = inject(DailyScoresService);
  private timerId: ReturnType<typeof setTimeout> | null = null;

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (e) {
        console.error('Error requesting notification permission', e);
        return false;
      }
    }
    
    return false;
  }

  async scheduleDailyReminder() {
    const granted = await this.requestPermission();
    if (!granted) return;

    this.scheduleNextCheck();
  }

  private scheduleNextCheck() {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }

    const now = new Date();
    const reminderTime = new Date(now);
    reminderTime.setHours(21, 30, 0, 0);

    if (now.getTime() > reminderTime.getTime()) {
      // Already past 21:30 today, schedule for tomorrow
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const timeUntilReminder = reminderTime.getTime() - now.getTime();
    
    this.timerId = setTimeout(async () => {
      await this.checkAndNotify();
      // Schedule the next day's check
      this.scheduleNextCheck();
    }, timeUntilReminder);
  }

  private async checkAndNotify() {
    try {
      // Check if score is already set today
      const score = await firstValueFrom(this.dailyScoresService.getTodayScore());
      if (!score) {
        new Notification('Pocket Discipline', {
          body: 'Time to set your daily score!',
          icon: '/assets/icons/icon-192x192.png'
        });
      }
    } catch (e) {
      console.error('Failed to check today score for notification', e);
    }
  }
}
