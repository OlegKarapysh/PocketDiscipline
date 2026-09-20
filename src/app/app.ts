import type { OnInit} from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { LayoutComponent } from './shared/components/layout/layout';
import { NotificationService } from './core/services/notification.service';
import { QuickSpendEventService } from './features/rewards/services/quick-spend-event.service';

@Component({
  imports: [LayoutComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly title = signal('pocket-discipline');
  private notificationService = inject(NotificationService);
  private quickSpendEventService = inject(QuickSpendEventService);

  ngOnInit() {
    this.notificationService.scheduleDailyReminder().subscribe();
    this.quickSpendEventService.initialize();
  }
}
