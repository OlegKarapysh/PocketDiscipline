import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { from } from 'rxjs';
import { TaskService } from '../../../../core/services/task.service';
import type { DisciplineItem } from '../../../../core/models/discipline-item.model';
import { DisciplineItemType } from '../../../../core/models/discipline-item-type.enum';
import { Amount } from '../../../../shared/components/amount/amount';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-task-list',
  imports: [MatCardModule, MatListModule, MatCheckboxModule, MatButtonModule, MatChipsModule, Amount, EmptyState],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
})
export class TaskList {
  private readonly taskService = inject(TaskService);
  readonly tasks = toSignal(from(this.taskService.tasks$));

  async completeTask(task: DisciplineItem): Promise<void> {
    if (!task.isCompleted) {
      try {
        await this.taskService.completeTask(task.id);
      } catch (error) {
        console.error(error);
      }
    }
  }

  async addDummyTask(): Promise<void> {
    try {
      await this.taskService.addTask('Drink 2L Water', DisciplineItemType.HABIT, 10);
      await this.taskService.addTask('Read 10 pages', DisciplineItemType.HABIT, 20);
      await this.taskService.addTask('Pay internet bill', DisciplineItemType.ONEOFF, 5);
    } catch (error) {
      console.error(error);
    }
  }
}
