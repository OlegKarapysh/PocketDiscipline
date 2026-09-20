import { DestroyRef, Service, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { EventBusService } from '../../../core/services/event-bus.service';
import { QuickSpendDialog } from '../components/quick-spend-dialog/quick-spend-dialog';

export const QUICK_SPEND_DIALOG_WIDTH = '440px';

@Service()
export class QuickSpendEventService {
  private readonly eventBus = inject(EventBusService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    this.eventBus
      .on('REQUEST_QUICK_SPEND')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.dialog.open(QuickSpendDialog, {
          width: QUICK_SPEND_DIALOG_WIDTH,
        });
      });
  }
}
