import { DestroyRef, Service, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { EventBusService } from '../../../core/services/event-bus.service';
import { SnackBarService } from '../../../shared/services/snack-bar.service';

@Service()
export class QuickSpendEventService {
  private readonly eventBus = inject(EventBusService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(SnackBarService);
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
      .subscribe(() => void this.openDialog());
  }

  // Lazy so the dialog and its form code stay out of the initial bundle.
  private openDialog(): Promise<void> {
    return import('../components/quick-spend-dialog/quick-spend-dialog')
      .then((m) => {
        this.dialog.open(m.QuickSpendDialog, { width: '440px' });
      })
      .catch((e: unknown) => {
        console.error('Failed to open Quick spend:', e);
        this.snackBar.show('Could not open Quick spend. Try again.');
      });
  }
}
