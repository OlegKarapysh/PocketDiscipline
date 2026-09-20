import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GoalList } from '../../components/goal-list/goal-list';
import { GoalService } from '../../services/goal.service';
import type { Goal } from '../../../../core/models/goal.model';
import { GoalFormDialog } from '../../components/goal-form-dialog/goal-form-dialog';
import type { GoalFormDialogData } from '../../models/goal-form-dialog-data.model';
import type { GoalFormResult } from '../../models/goal-form-result.model';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { catchError, EMPTY, filter, from, switchMap, tap } from 'rxjs';

const DIALOG_WIDTH = '400px';
const MSG_GOAL_COMPLETED = 'Goal completed!';
const MSG_GOAL_UNDONE = 'Completion undone';
const MSG_GOAL_DELETED = 'Goal deleted';
const MSG_GOAL_ADDED = 'Goal added';
const MSG_GOAL_UPDATED = 'Goal updated';

@Component({
  imports: [MatButtonModule, MatIconModule, MatDialogModule, GoalList],
  selector: 'app-goals-page',
  styleUrl: './goals-page.scss',
  templateUrl: './goals-page.html',
})
export class GoalsPage {
  private goalService = inject(GoalService);
  private dialog = inject(MatDialog);
  private snackBar = inject(SnackBarService);
  private destroyRef = inject(DestroyRef);

  readonly activeGoals = toSignal(this.goalService.getActiveGoals(), { initialValue: [] });
  readonly completedGoals = toSignal(this.goalService.getCompletedGoals(), { initialValue: [] });

  async completeGoal(id: string): Promise<void> {
    try {
      await this.goalService.completeGoal(id);
      this.snackBar.show(MSG_GOAL_COMPLETED);
    } catch (e: unknown) {
      this.snackBar.error(e);
    }
  }

  async undoCompleteGoal(id: string): Promise<void> {
    try {
      await this.goalService.undoCompleteGoal(id);
      this.snackBar.show(MSG_GOAL_UNDONE);
    } catch (e: unknown) {
      this.snackBar.error(e);
    }
  }

  async deleteGoal(id: string): Promise<void> {
    try {
      await this.goalService.deleteGoal(id);
      this.snackBar.show(MSG_GOAL_DELETED);
    } catch (e: unknown) {
      this.snackBar.error(e);
    }
  }

  openAddDialog(): void {
    this.openGoalDialog();
  }

  openEditDialog(goal: Goal): void {
    this.openGoalDialog(goal);
  }

  private openGoalDialog(goal?: Goal): void {
    const dialogRef = this.dialog.open<GoalFormDialog, GoalFormDialogData, GoalFormResult>(
      GoalFormDialog,
      {
        data: goal ? { goal } : {},
        width: DIALOG_WIDTH,
      }
    );

    dialogRef
      .afterClosed()
      .pipe(
        filter((result): result is GoalFormResult => !!result),
        switchMap((result) =>
          from(
            goal
              ? this.goalService.updateGoal(goal.id, result.title, result.rewardValue)
              : this.goalService.addGoal(result.title, result.rewardValue)
          ).pipe(tap(() => { this.snackBar.show(goal ? MSG_GOAL_UPDATED : MSG_GOAL_ADDED); }))
        ),
        catchError((e: unknown) => {
          this.snackBar.error(e);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }
}
