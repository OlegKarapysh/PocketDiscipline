import { Component, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DailyTasksService } from '../../services/daily-tasks.service';
import { DailyTaskItem } from '../daily-task-item/daily-task-item';
import type { DailyTask } from '../../../../core/models/daily-task.model';
import type { DailyTaskDifficulty } from '../../../../core/models/daily-task-difficulty.model';
import { DailyTaskForm } from '../daily-task-form/daily-task-form';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import type { DailyTaskDraft } from '../../models/daily-task-draft.model';
import { NEW_ITEM_QUERY_PARAM } from '../../../../shared/constants/new-item-query-param.const';
import { ClockService } from '../../../../core/services/clock.service';

@Component({
  imports: [MatButtonModule, MatIconModule, DailyTaskItem, DailyTaskForm, EmptyState],
  selector: 'app-daily-task-list',
  styleUrl: './daily-task-list.scss',
  templateUrl: './daily-task-list.html',
})
export class DailyTaskList {
  private readonly dailyTasksService = inject(DailyTasksService);
  private readonly clock = inject(ClockService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly tasks = toSignal(this.dailyTasksService.tasks$);
  readonly showForm = signal(false);

  constructor() {
    effect(() => {
      this.clock.today();
      void this.dailyTasksService.resetBrokenStreaks().catch((e: unknown) => {
        console.error(e);
      });
    });

    // The shell's "New task" quick action links here with ?new. Dropping the param afterwards keeps a
    // reload from reopening the form and makes the next tap a real navigation again.
    this.route.queryParamMap
      .pipe(
        filter((params) => params.has(NEW_ITEM_QUERY_PARAM)),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.showForm.set(true);
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { [NEW_ITEM_QUERY_PARAM]: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
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

  async onTaskCreated(event: DailyTaskDraft): Promise<void> {
    this.showForm.set(false);
    try {
      await this.dailyTasksService.createTask(event.title, event.difficulties);
    } catch (e: unknown) {
      console.error(e);
    }
  }
}
