import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/data-models';
import { Observable, from } from 'rxjs';

@Component({
  selector: 'app-balance-widget',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './balance-widget.html',
  styleUrl: './balance-widget.scss'
})
export class BalanceWidgetComponent {
  userService = inject(UserService);
  user$ = from(this.userService.user$) as Observable<User | undefined>;
}
