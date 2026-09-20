import type { OnDestroy} from '@angular/core';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import type { Subscription } from 'rxjs';
import { EventBusService } from '../../../core/services/event-bus.service';
import { QuickSpendDialogComponent } from '../components/quick-spend-dialog/quick-spend-dialog';

export const QUICK_SPEND_DIALOG_WIDTH = '440px';

@Injectable({ providedIn: 'root' })
export class QuickSpendEventService implements OnDestroy {
  private readonly eventBus = inject(EventBusService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private subscription?: Subscription;

  initialize(): void {
    if (this.subscription && !this.subscription.closed) {
      return;
    }
    this.subscription = this.eventBus
      .on('REQUEST_QUICK_SPEND')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.dialog.open(QuickSpendDialogComponent, {
          width: QUICK_SPEND_DIALOG_WIDTH,
        });
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }
}
