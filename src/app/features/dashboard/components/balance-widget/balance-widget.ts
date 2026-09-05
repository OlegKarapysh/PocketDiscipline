import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/user.model';
import { EventBusService } from '../../../../core/services/event-bus.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-balance-widget',
  imports: [DecimalPipe, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './balance-widget.html',
  styleUrl: './balance-widget.scss',
})
export class BalanceWidgetComponent {
  userService = inject(UserService);
  eventBus = inject(EventBusService);

  user = toSignal<User | undefined>(this.userService.user$);

  openQuickSpend(): void {
    this.eventBus.emit({ type: 'REQUEST_QUICK_SPEND' });
  }
}
