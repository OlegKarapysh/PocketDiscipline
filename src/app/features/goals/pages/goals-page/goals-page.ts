import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GoalList } from '../../components/goal-list/goal-list';
import { GoalService } from '../../services/goal.service';
import type { Goal } from '../../../../core/models/goal.model';
import { GoalFormDialog } from '../../components/goal-form-dialog/goal-form-dialog';
import type { GoalFormDialogData } from '../../models/goal-form-dialog-data.model';
import { catchError, EMPTY, filter, from, switchMap, tap } from 'rxjs';

const SNACKBAR_DURATION_MS = 3000;
const SNACKBAR_ACTION_CLOSE = 'Close';
const DIALOG_WIDTH = '400px';
const MSG_GOAL_COMPLETED = 'Goal completed!';
const MSG_GOAL_UNDONE = 'Completion undone';
const MSG_GOAL_DELETED = 'Goal deleted';
const MSG_GOAL_ADDED = 'Goal added';
const MSG_GOAL_UPDATED = 'Goal updated';
const MSG_UNKNOWN_ERROR = 'Unknown error occurred';

@Component({
  imports: [MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule, GoalList],
  selector: 'app-goals-page',
  styleUrl: './goals-page.scss',
  templateUrl: './goals-page.html',
})
export class GoalsPage {
  private goalService = inject(GoalService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  readonly activeGoals = toSignal(this.goalService.getActiveGoals(), { initialValue: [] });
  readonly completedGoals = toSignal(this.goalService.getCompletedGoals(), { initialValue: [] });

  async completeGoal(id: string): Promise<void> {
    try {
      await this.goalService.completeGoal(id);
      this.snackBar.open(MSG_GOAL_COMPLETED, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : MSG_UNKNOWN_ERROR;
      this.snackBar.open(message, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
    }
  }

  async undoCompleteGoal(id: string): Promise<void> {
    try {
      await this.goalService.undoCompleteGoal(id);
      this.snackBar.open(MSG_GOAL_UNDONE, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : MSG_UNKNOWN_ERROR;
      this.snackBar.open(message, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
    }
  }

  async deleteGoal(id: string): Promise<void> {
    try {
      await this.goalService.deleteGoal(id);
      this.snackBar.open(MSG_GOAL_DELETED, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : MSG_UNKNOWN_ERROR;
      this.snackBar.open(message, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
    }
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open<GoalFormDialog, GoalFormDialogData, { title: string; rewardValue: number }>(
      GoalFormDialog,
      {
        data: {},
        width: DIALOG_WIDTH,
      }
    );

    dialogRef
      .afterClosed()
      .pipe(
        filter((result): result is { title: string; rewardValue: number } => !!result),
        switchMap((result) =>
          from(this.goalService.addGoal(result.title, result.rewardValue)).pipe(
            tap(() => this.snackBar.open(MSG_GOAL_ADDED, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS })),
            catchError((e: unknown) => {
              const message = e instanceof Error ? e.message : MSG_UNKNOWN_ERROR;
              this.snackBar.open(message, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
              return EMPTY;
            })
          )
        ),
        catchError((e: unknown) => {
          const message = e instanceof Error ? e.message : MSG_UNKNOWN_ERROR;
          this.snackBar.open(message, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        error: (e: unknown) => {
          const message = e instanceof Error ? e.message : MSG_UNKNOWN_ERROR;
          this.snackBar.open(message, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
        },
      });
  }

  openEditDialog(goal: Goal): void {
    const dialogRef = this.dialog.open<GoalFormDialog, GoalFormDialogData, { title: string; rewardValue: number }>(
      GoalFormDialog,
      {
        data: { goal },
        width: DIALOG_WIDTH,
      }
    );

    dialogRef
      .afterClosed()
      .pipe(
        filter((result): result is { title: string; rewardValue: number } => !!result),
        switchMap((result) =>
          from(this.goalService.updateGoal(goal.id, result.title, result.rewardValue)).pipe(
            tap(() => this.snackBar.open(MSG_GOAL_UPDATED, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS })),
            catchError((e: unknown) => {
              const message = e instanceof Error ? e.message : MSG_UNKNOWN_ERROR;
              this.snackBar.open(message, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
              return EMPTY;
            })
          )
        ),
        catchError((e: unknown) => {
          const message = e instanceof Error ? e.message : MSG_UNKNOWN_ERROR;
          this.snackBar.open(message, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        error: (e: unknown) => {
          const message = e instanceof Error ? e.message : MSG_UNKNOWN_ERROR;
          this.snackBar.open(message, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
        },
      });
  }
}
