import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BalanceWidgetComponent } from './components/balance-widget/balance-widget';
import { TaskListComponent } from './components/task-list/task-list';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BalanceWidgetComponent, TaskListComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard {
}
