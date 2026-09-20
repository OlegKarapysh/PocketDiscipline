import type { OnInit } from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DailyTasksService } from '../../services/daily-tasks.service';
import { DailyTaskItem } from '../daily-task-item/daily-task-item';
import type { DailyTask } from '../../../../core/models/daily-task.model';
import type { DailyTaskDifficulty } from '../../../../core/models/daily-task-difficulty.model';
import { DailyTaskForm } from '../daily-task-form/daily-task-form';

@Component({
  imports: [MatButtonModule, MatIconModule, DailyTaskItem, DailyTaskForm, AsyncPipe],
  selector: 'app-daily-task-list',
  styleUrl: './daily-task-list.scss',
  templateUrl: './daily-task-list.html',
})
export class DailyTaskList implements OnInit {
  private dailyTasksService = inject(DailyTasksService);

  tasks$ = this.dailyTasksService.tasks$;
  readonly showForm = signal(false);

  ngOnInit(): void {
    void this.dailyTasksService.resetBrokenStreaks().catch((e: unknown) => {
      console.error(e);
    });
  }

  openForm() {
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  async onCompleteTask(task: DailyTask, difficulty: DailyTaskDifficulty): Promise<void> {
    try {
      await this.dailyTasksService.completeTask(task, difficulty);
    } catch (e: unknown) {
      console.error(e);
    }
  }

  async onTaskCreated(event: { title: string; difficulties: DailyTaskDifficulty[] }): Promise<void> {
    this.showForm.set(false);
    try {
      await this.dailyTasksService.createTask(event.title, event.difficulties);
    } catch (e: unknown) {
      console.error(e);
    }
  }
}
