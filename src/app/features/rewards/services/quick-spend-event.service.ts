import { Injectable, OnDestroy, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { EventBusService } from '../../../core/services/event-bus.service';
import { QuickSpendDialogComponent } from '../components/quick-spend-dialog/quick-spend-dialog';

export const QUICK_SPEND_DIALOG_WIDTH = '440px';

@Injectable({ providedIn: 'root' })
export class QuickSpendEventService implements OnDestroy {
  private readonly eventBus = inject(EventBusService);
  private readonly dialog = inject(MatDialog);
  private subscription?: Subscription;

  initialize(): void {
    if (this.subscription) {
      return;
    }
    this.subscription = this.eventBus.on('REQUEST_QUICK_SPEND').subscribe(() => {
      this.dialog.open(QuickSpendDialogComponent, {
        width: QUICK_SPEND_DIALOG_WIDTH,
      });
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
