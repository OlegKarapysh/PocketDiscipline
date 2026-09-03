import { Component, inject } from '@angular/core';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/user.model';
import { Observable, from } from 'rxjs';

@Component({
  selector: 'app-balance-widget',
  imports: [AsyncPipe, DecimalPipe, MatCardModule, MatIconModule],
  templateUrl: './balance-widget.html',
  styleUrl: './balance-widget.scss'
})
export class BalanceWidgetComponent {
  userService = inject(UserService);
  user$ = from(this.userService.user$) as Observable<User | undefined>;
}
