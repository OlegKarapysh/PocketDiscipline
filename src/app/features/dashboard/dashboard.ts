import { Component } from '@angular/core';

import { BalanceWidgetComponent } from './components/balance-widget/balance-widget';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BalanceWidgetComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard {}
