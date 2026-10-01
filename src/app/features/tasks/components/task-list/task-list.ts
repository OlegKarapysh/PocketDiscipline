import { Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { EMPTY, catchError, from } from 'rxjs';
import { TaskService } from '../../../../core/services/task.service';
import { ClockService } from '../../../../core/services/clock.service';
import type { DisciplineItem } from '../../../../core/models/discipline-item.model';
import { DisciplineItemType } from '../../../../core/models/discipline-item-type.enum';
import { Amount } from '../../../../shared/components/amount/amount';
import { Badge } from '../../../../shared/components/badge/badge';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';

@Component({
  selector: 'app-task-list',
  imports: [MatCardModule, MatCheckboxModule, Amount, Badge, EmptyState],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
})
export class TaskList {
  private readonly taskService = inject(TaskService);
  private readonly clock = inject(ClockService);
  private readonly snackBar = inject(SnackBarService);

  readonly tasks = toSignal(
    from(this.taskService.tasks$).pipe(
      catchError((error: unknown) => {
        this.snackBar.error(error, 'Failed to load tasks');
        return EMPTY;
      }),
    ),
  );

  constructor() {
    effect(() => {
      this.clock.today();
      void this.taskService.performDailyReset().catch((error: unknown) => {
        console.error(error);
      });
    });
  }

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
