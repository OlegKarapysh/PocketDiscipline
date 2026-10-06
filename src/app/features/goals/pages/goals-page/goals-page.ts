import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GoalList } from '../../components/goal-list/goal-list';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { GoalService } from '../../services/goal.service';
import type { Goal } from '../../../../core/models/goal.model';
import { GoalFormDialog } from '../../components/goal-form-dialog/goal-form-dialog';
import type { GoalFormDialogData } from '../../models/goal-form-dialog-data.model';
import type { GoalFormResult } from '../../models/goal-form-result.model';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { CelebrationService } from '../../../../shared/services/celebration.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { catchError, EMPTY, filter, from, switchMap, tap } from 'rxjs';

@Component({
  imports: [PageHeader, MatButtonModule, MatIconModule, MatDialogModule, GoalList],
  selector: 'app-goals-page',
  styleUrl: './goals-page.scss',
  templateUrl: './goals-page.html',
})
export class GoalsPage {
  private readonly goalService = inject(GoalService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(SnackBarService);
  private readonly celebration = inject(CelebrationService);
  private readonly confirmService = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeGoals = toSignal(
    this.goalService.getActiveGoals().pipe(
      catchError((e: unknown) => {
        this.snackBar.error(e, 'Failed to load goals');
        return EMPTY;
      }),
    ),
    { initialValue: [] },
  );
  readonly completedGoals = toSignal(
    this.goalService.getCompletedGoals().pipe(
      catchError((e: unknown) => {
        this.snackBar.error(e, 'Failed to load completed goals');
        return EMPTY;
      }),
    ),
    { initialValue: [] },
  );

  async completeGoal(id: string): Promise<void> {
    const goal = this.activeGoals().find((g) => g.id === id);
    let completed: boolean;
    try {
      completed = await this.goalService.completeGoal(id);
    } catch (e: unknown) {
      this.snackBar.error(e);
      return;
    }
    if (!completed) return;

    this.celebration
      .show({ title: 'Goal complete', subtitle: goal?.title, amount: goal?.rewardValue, canUndo: true })
      .pipe(
        filter((result) => result === 'undo'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => void this.undoCompleteGoal(id));
  }

  async undoCompleteGoal(id: string): Promise<void> {
    try {
      if (await this.goalService.undoCompleteGoal(id)) {
        this.snackBar.show('Completion undone');
      }
    } catch (e: unknown) {
      this.snackBar.error(e);
    }
  }

  confirmDeleteGoal(id: string): void {
    const goal = this.activeGoals().find((g) => g.id === id);
    if (!goal) return;

    this.confirmService
      .ask({
        title: 'Delete goal',
        message: `Are you sure you want to delete "${goal.title}"? Your balance does not change.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDestructive: true,
      })
      .pipe(
        switchMap(() =>
          from(this.goalService.deleteGoal(id)).pipe(
            tap(() => {
              this.snackBar.show('Goal deleted');
            }),
            catchError((e: unknown) => {
              this.snackBar.error(e);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  openAddDialog(): void {
    this.openGoalDialog();
  }

  openEditDialog(goal: Goal): void {
    this.openGoalDialog(goal);
  }

  private openGoalDialog(goal?: Goal): void {
    const dialogRef = this.dialog.open<GoalFormDialog, GoalFormDialogData, GoalFormResult>(GoalFormDialog, {
      data: goal ? { goal } : {},
      width: '400px',
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((result): result is GoalFormResult => !!result),
        switchMap((result) =>
          from(
            goal
              ? this.goalService.updateGoal(goal.id, result.title, result.rewardValue)
              : this.goalService.addGoal(result.title, result.rewardValue),
          ).pipe(
            tap(() => {
              this.snackBar.show(goal ? 'Goal updated' : 'Goal added');
            }),
          ),
        ),
        catchError((e: unknown) => {
          this.snackBar.error(e);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
