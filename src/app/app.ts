import { Component, signal, inject, OnInit } from '@angular/core';
import { LayoutComponent } from './shared/components/layout/layout';
import { NotificationService } from './core/services/notification.service';

@Component({
  imports: [LayoutComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly title = signal('pocket-discipline');
  private notificationService = inject(NotificationService);

  ngOnInit() {
    this.notificationService.scheduleDailyReminder();
  }
}
