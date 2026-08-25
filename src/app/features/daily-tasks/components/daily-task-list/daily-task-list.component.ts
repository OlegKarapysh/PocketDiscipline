import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyTasksService } from '../../services/daily-tasks.service';
import { DailyTaskItemComponent } from '../daily-task-item/daily-task-item.component';
import { DailyTask, DailyTaskDifficulty } from '../../models/daily-task.model';

import { DailyTaskFormComponent } from '../daily-task-form/daily-task-form.component';

@Component({
  standalone: true,
  imports: [CommonModule, DailyTaskItemComponent, DailyTaskFormComponent],
  selector: 'app-daily-task-list',
  styleUrl: './daily-task-list.component.scss',
  templateUrl: './daily-task-list.component.html',
})
export class DailyTaskListComponent {
  private dailyTasksService = inject(DailyTasksService);
  
  tasks$ = this.dailyTasksService.tasks$;
  showForm = false;

  async onCompleteTask(task: DailyTask, difficulty: DailyTaskDifficulty) {
    await this.dailyTasksService.completeTask(task, difficulty);
  }

  onTaskCreated(event: {title: string, difficulties: DailyTaskDifficulty[]}) {
    this.dailyTasksService.createTask(event.title, event.difficulties);
    this.showForm = false;
  }
}
