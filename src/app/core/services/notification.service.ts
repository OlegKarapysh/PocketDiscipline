import { Service, inject } from '@angular/core';
import { DailyScoresService } from '../../features/daily-scores/services/daily-scores.service';
import { firstValueFrom } from 'rxjs';

const REMINDER_HOUR = 21;
const REMINDER_MINUTE = 30;
const REMINDER_SECOND = 0;
const REMINDER_MILLISECOND = 0;
const DAYS_INCREMENT = 1;
const PERMISSION_GRANTED = 'granted';
const PERMISSION_DENIED = 'denied';
const APP_TITLE = 'Pocket Discipline';
const NOTIFICATION_REMINDER_BODY = 'Time to set your daily score!';
const NOTIFICATION_ICON_PATH = '/assets/icons/icon-192x192.png';

@Service()
export class NotificationService {
  private dailyScoresService = inject(DailyScoresService);
  private timerId: ReturnType<typeof setTimeout> | null = null;

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === PERMISSION_GRANTED) {
      return true;
    }

    if (Notification.permission !== PERMISSION_DENIED) {
      try {
        const permission = await Notification.requestPermission();
        return permission === PERMISSION_GRANTED;
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
    reminderTime.setHours(REMINDER_HOUR, REMINDER_MINUTE, REMINDER_SECOND, REMINDER_MILLISECOND);

    if (now.getTime() > reminderTime.getTime()) {
      reminderTime.setDate(reminderTime.getDate() + DAYS_INCREMENT);
    }

    const timeUntilReminder = reminderTime.getTime() - now.getTime();

    this.timerId = setTimeout(async () => {
      await this.checkAndNotify();
      this.scheduleNextCheck();
    }, timeUntilReminder);
  }

  private async checkAndNotify() {
    try {
      const score = await firstValueFrom(this.dailyScoresService.getTodayScore());
      if (!score) {
        new Notification(APP_TITLE, {
          body: NOTIFICATION_REMINDER_BODY,
          icon: NOTIFICATION_ICON_PATH
        });
      }
    } catch (e) {
      console.error('Failed to check today score for notification', e);
    }
  }
}
