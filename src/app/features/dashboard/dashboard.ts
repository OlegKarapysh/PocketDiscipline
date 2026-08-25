import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BalanceWidgetComponent } from './components/balance-widget/balance-widget';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BalanceWidgetComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard {
}
