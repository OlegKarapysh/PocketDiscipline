import { Service, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, firstValueFrom, from, of, tap } from 'rxjs';
import { BrowserNotificationService } from '../../../core/services/browser-notification.service';
import { DailyScoresService } from './daily-scores.service';

const REMINDER_HOUR = 21;
const REMINDER_MINUTE = 30;
const APP_TITLE = 'Pocket Discipline';
const REMINDER_BODY = 'Time to set your daily score!';
const REMINDER_ICON_PATH = '/assets/icons/icon-192x192.png';

@Service()
export class DailyScoreReminderService {
  private notifications = inject(BrowserNotificationService);
  private dailyScoresService = inject(DailyScoresService);
  private timerId: ReturnType<typeof setTimeout> | null = null;

  scheduleDailyReminder(): Observable<boolean> {
    return from(this.notifications.requestPermission()).pipe(
      tap((granted) => {
        if (granted) this.scheduleNextCheck();
      }),
      catchError((err: unknown) => {
        console.error('Failed to schedule daily reminder:', err);
        return of(false);
      })
    );
  }

  private scheduleNextCheck(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }

    const now = new Date();
    const reminderTime = new Date(now);
    reminderTime.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);

    // >= not >: the timer can fire exactly on the deadline, and a strict > would then re-arm
    // with a 0ms delay and fire a duplicate reminder instead of rolling to tomorrow.
    if (now.getTime() >= reminderTime.getTime()) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    this.timerId = setTimeout(async () => {
      await this.notifyIfScoreMissing();
      this.scheduleNextCheck();
    }, reminderTime.getTime() - now.getTime());
  }

  private async notifyIfScoreMissing(): Promise<void> {
    try {
      const score = await firstValueFrom(this.dailyScoresService.getTodayScore());
      if (!score) {
        this.notifications.show(APP_TITLE, { body: REMINDER_BODY, icon: REMINDER_ICON_PATH });
      }
    } catch (e) {
      console.error('Failed to check today score for notification', e);
    }
  }
}
