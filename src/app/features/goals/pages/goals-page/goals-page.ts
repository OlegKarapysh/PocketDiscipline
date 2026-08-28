import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GoalList } from '../../components/goal-list/goal-list';
import { GoalService } from '../../services/goal.service';
import { Goal } from '../../models/goal.model';
import { GoalFormDialog } from '../../components/goal-form-dialog/goal-form-dialog';
import { from } from 'rxjs';

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
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule, GoalList],
  selector: 'app-goals-page',
  styleUrl: './goals-page.scss',
  templateUrl: './goals-page.html',
})
export class GoalsPage {
  private goalService = inject(GoalService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  activeGoals$ = from(this.goalService.getActiveGoals());
  completedGoals$ = from(this.goalService.getCompletedGoals());

  async completeGoal(id: string) {
    await this.goalService.completeGoal(id);
    this.snackBar.open(MSG_GOAL_COMPLETED, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
  }

  async undoCompleteGoal(id: string) {
    await this.goalService.undoCompleteGoal(id);
    this.snackBar.open(MSG_GOAL_UNDONE, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
  }

  async deleteGoal(id: string) {
    await this.goalService.deleteGoal(id);
    this.snackBar.open(MSG_GOAL_DELETED, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(GoalFormDialog, {
      data: {},
      width: DIALOG_WIDTH,
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.goalService.addGoal(result.title, result.rewardValue);
          this.snackBar.open(MSG_GOAL_ADDED, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : MSG_UNKNOWN_ERROR;
          this.snackBar.open(message, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
        }
      }
    });
  }

  openEditDialog(goal: Goal) {
    const dialogRef = this.dialog.open(GoalFormDialog, {
      data: { goal },
      width: DIALOG_WIDTH,
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.goalService.updateGoal(goal.id, result.title, result.rewardValue);
          this.snackBar.open(MSG_GOAL_UPDATED, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : MSG_UNKNOWN_ERROR;
          this.snackBar.open(message, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
        }
      }
    });
  }
}
