import { Component } from '@angular/core';

import { TaskListComponent } from '../../components/task-list/task-list';
import { DailyTaskListComponent } from '../../../daily-tasks/components/daily-task-list/daily-task-list.component';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [TaskListComponent, DailyTaskListComponent],
  templateUrl: './tasks-page.html',
  styleUrls: ['./tasks-page.scss'],
})
export class TasksPage {}
