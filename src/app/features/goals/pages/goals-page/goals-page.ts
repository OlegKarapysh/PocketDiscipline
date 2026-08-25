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
    this.snackBar.open('Goal completed!', 'Close', { duration: 3000 });
  }

  async undoCompleteGoal(id: string) {
    await this.goalService.undoCompleteGoal(id);
    this.snackBar.open('Completion undone', 'Close', { duration: 3000 });
  }

  async deleteGoal(id: string) {
    await this.goalService.deleteGoal(id);
    this.snackBar.open('Goal deleted', 'Close', { duration: 3000 });
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(GoalFormDialog, {
      data: {},
      width: '400px',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.goalService.addGoal(result.title, result.rewardValue);
          this.snackBar.open('Goal added', 'Close', { duration: 3000 });
        } catch (e: any) {
          this.snackBar.open(e.message, 'Close', { duration: 3000 });
        }
      }
    });
  }

  openEditDialog(goal: Goal) {
    const dialogRef = this.dialog.open(GoalFormDialog, {
      data: { goal },
      width: '400px',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.goalService.updateGoal(goal.id, result.title, result.rewardValue);
          this.snackBar.open('Goal updated', 'Close', { duration: 3000 });
        } catch (e: any) {
          this.snackBar.open(e.message, 'Close', { duration: 3000 });
        }
      }
    });
  }
}
