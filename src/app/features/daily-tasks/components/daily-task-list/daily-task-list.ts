import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, catchError, filter, from, switchMap, tap } from 'rxjs';
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
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';

@Component({
  imports: [MatButtonModule, MatIconModule, DailyTaskItem, DailyTaskForm, EmptyState],
  selector: 'app-daily-task-list',
  styleUrl: './daily-task-list.scss',
  templateUrl: './daily-task-list.html',
})
export class DailyTaskList {
  private readonly dailyTasksService = inject(DailyTasksService);
  private readonly clock = inject(ClockService);
  private readonly snackBar = inject(SnackBarService);
  private readonly confirmService = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly tasks = toSignal(
    this.dailyTasksService.tasks$.pipe(
      catchError((error: unknown) => {
        this.snackBar.error(error, 'Failed to load daily tasks');
        return EMPTY;
      }),
    ),
  );
  readonly showForm = signal(false);
  readonly editingTaskId = signal<string | null>(null);
  readonly saving = signal(false);

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

  openEdit(task: DailyTask): void {
    this.editingTaskId.set(task.id);
  }

  closeEdit(): void {
    this.editingTaskId.set(null);
  }

  async onCompleteTask(task: DailyTask, difficulty: DailyTaskDifficulty): Promise<void> {
    try {
      await this.dailyTasksService.completeTask(task, difficulty);
    } catch (e: unknown) {
      this.snackBar.error(e, 'Failed to complete the daily task');
    }
  }

  // The form stays open with what was typed until the save succeeds, so a failed save loses nothing.
  async onTaskCreated(draft: DailyTaskDraft): Promise<void> {
    if (await this.persist(() => this.dailyTasksService.createTask(draft.title, draft.difficulties))) {
      this.closeForm();
      this.snackBar.show('Daily task added');
    }
  }

  async onTaskEdited(task: DailyTask, draft: DailyTaskDraft): Promise<void> {
    if (await this.persist(() => this.dailyTasksService.updateTask(task.id, draft.title, draft.difficulties))) {
      this.closeEdit();
      this.snackBar.show('Daily task updated');
    }
  }

  confirmDelete(task: DailyTask): void {
    this.confirmService
      .ask({
        title: 'Delete daily task',
        message: `Are you sure you want to delete "${task.title}"? Its completion history is kept, and your balance does not change.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDestructive: true,
      })
      .pipe(
        switchMap(() =>
          from(this.dailyTasksService.deleteTask(task.id)).pipe(
            tap(() => {
              this.snackBar.show('Daily task deleted');
            }),
            catchError((e: unknown) => {
              this.snackBar.error(e, 'Failed to delete the daily task');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private async persist(save: () => Promise<void>): Promise<boolean> {
    this.saving.set(true);
    try {
      await save();
      return true;
    } catch (e: unknown) {
      this.snackBar.error(e, 'Failed to save the daily task');
      return false;
    } finally {
      this.saving.set(false);
    }
  }
}
