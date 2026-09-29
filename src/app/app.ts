import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { Layout } from './shared/components/layout/layout';
import { DailyScoreReminderService } from './features/daily-scores/services/daily-score-reminder.service';
import { QuickSpendEventService } from './features/rewards/services/quick-spend-event.service';

@Component({
  imports: [Layout],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private dailyScoreReminderService = inject(DailyScoreReminderService);
  private quickSpendEventService = inject(QuickSpendEventService);

  ngOnInit() {
    this.dailyScoreReminderService.scheduleDailyReminder().subscribe();
    this.quickSpendEventService.initialize();
  }
}
