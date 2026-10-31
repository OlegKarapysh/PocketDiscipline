import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EMPTY, catchError, from, switchMap, tap } from 'rxjs';
import { TaskService } from '../../services/task.service';
import type { DisciplineItem } from '../../../../core/models/discipline-item.model';
import type { TaskDraft } from '../../models/task-draft.model';
import { TaskForm } from '../task-form/task-form';
import { TaskItem } from '../task-item/task-item';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { MONEY_FORMAT } from '../../../../shared/constants/money-format.const';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';

@Component({
  selector: 'app-task-list',
  imports: [MatButtonModule, MatIconModule, TaskForm, TaskItem, EmptyState],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
})
export class TaskList {
  private readonly taskService = inject(TaskService);
  private readonly snackBar = inject(SnackBarService);
  private readonly confirmService = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tasks = toSignal(
    this.taskService.tasks$.pipe(
      catchError((error: unknown) => {
        this.snackBar.error(error, 'Failed to load tasks');
        return EMPTY;
      }),
    ),
    { initialValue: undefined },
  );

  readonly showForm = signal(false);
  readonly editingTaskId = signal<string | null>(null);
  readonly showCompleted = signal(false);
  readonly saving = signal(false);

  readonly pending = computed(() => (this.tasks() ?? []).filter((task) => !task.isCompleted));
  readonly completed = computed(() => (this.tasks() ?? []).filter((task) => task.isCompleted));

  openForm(): void {
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  openEdit(task: DisciplineItem): void {
    this.editingTaskId.set(task.id);
  }

  closeEdit(): void {
    this.editingTaskId.set(null);
  }

  toggleCompleted(): void {
    this.showCompleted.update((show) => !show);
  }

  async onTaskCreated(draft: TaskDraft): Promise<void> {
    if (await this.persist(() => this.taskService.addTask(draft.title, draft.rewardValue))) {
      this.closeForm();
      this.snackBar.show('One-off task added');
    }
  }

  async onTaskEdited(task: DisciplineItem, draft: TaskDraft): Promise<void> {
    if (await this.persist(() => this.taskService.updateTask(task.id, draft.title, draft.rewardValue))) {
      this.closeEdit();
      this.snackBar.show('One-off task updated');
    }
  }

  confirmDelete(task: DisciplineItem): void {
    this.confirmService
      .ask({
        title: 'Delete one-off task',
        message: `Are you sure you want to delete "${task.title}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDestructive: true,
      })
      .pipe(
        switchMap(() =>
          from(this.taskService.deleteTask(task.id)).pipe(
            tap(() => {
              this.closeEdit();
              this.snackBar.show('One-off task deleted');
            }),
            catchError((error: unknown) => {
              this.snackBar.error(error, 'Failed to delete the one-off task');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  async onCompleteTask(task: DisciplineItem): Promise<void> {
    try {
      const reward = await this.taskService.completeTask(task.id);
      if (reward !== null) {
        this.snackBar.show(`${task.title} done · +${MONEY_FORMAT.format(reward)} ₴`);
      }
    } catch (error: unknown) {
      this.snackBar.error(error, 'Failed to complete the one-off task');
    }
  }

  async onUndoTask(task: DisciplineItem): Promise<void> {
    try {
      const undone = await this.taskService.undoCompleteTask(task.id);
      if (undone) {
        this.snackBar.show('Completion undone');
      }
    } catch (error: unknown) {
      this.snackBar.error(error, 'Failed to undo task completion');
    }
  }

  private async persist(save: () => Promise<void>): Promise<boolean> {
    this.saving.set(true);
    try {
      await save();
      return true;
    } catch (error: unknown) {
      this.snackBar.error(error, 'Failed to save the one-off task');
      return false;
    } finally {
      this.saving.set(false);
    }
  }
}
