import { Component } from '@angular/core';

import { TaskList } from '../../components/task-list/task-list';
import { DailyTaskList } from '../../../daily-tasks/components/daily-task-list/daily-task-list';

@Component({
  selector: 'app-tasks-page',
  imports: [TaskList, DailyTaskList],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.scss',
})
export class TasksPage {}
