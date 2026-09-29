import { Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, max, maxLength, min, minLength, required } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { GoalFormDialogData } from '../../models/goal-form-dialog-data.model';
import type { GoalFormResult } from '../../models/goal-form-result.model';

@Component({
  imports: [FormField, FormRoot, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  selector: 'app-goal-form-dialog',
  styleUrl: './goal-form-dialog.scss',
  templateUrl: './goal-form-dialog.html',
})
export class GoalFormDialog {
  readonly data = inject<GoalFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<GoalFormDialog, GoalFormResult>>(MatDialogRef);

  readonly model = signal<{ title: string; rewardValue: number | null }>({
    title: this.data.goal?.title ?? '',
    rewardValue: this.data.goal?.rewardValue ?? null,
  });

  readonly goalForm = form(this.model, (path) => {
    required(path.title, { message: 'Title is required' });
    minLength(path.title, 3, { message: 'Title must be at least 3 characters' });
    maxLength(path.title, 100, { message: 'Title cannot exceed 100 characters' });
    required(path.rewardValue, { message: 'Reward is required' });
    min(path.rewardValue, 1, { message: 'Reward must be greater than 0' });
    max(path.rewardValue, 10_000_000, { message: 'Reward is too large' });
  });

  onSubmit(): void {
    const { title, rewardValue } = this.model();
    if (this.goalForm().valid() && rewardValue !== null) {
      this.dialogRef.close({ title, rewardValue });
    }
  }
}
