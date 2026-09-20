import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, from, of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../../../../core/services/user.service';
import type { User } from '../../../../core/models/user.model';
import { EventBusService } from '../../../../core/services/event-bus.service';

@Component({
  selector: 'app-balance-widget',
  imports: [DecimalPipe, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './balance-widget.html',
  styleUrl: './balance-widget.scss',
})
export class BalanceWidgetComponent {
  private readonly userService = inject(UserService);
  private readonly eventBus = inject(EventBusService);

  readonly user = toSignal<User | undefined>(
    from(this.userService.user$).pipe(
      catchError((error: unknown) => {
        console.error('Failed to load user balance:', error);
        return of(undefined);
      })
    ),
    { initialValue: undefined }
  );

  openQuickSpend(): void {
    this.eventBus.emit({ type: 'REQUEST_QUICK_SPEND' });
  }
}

