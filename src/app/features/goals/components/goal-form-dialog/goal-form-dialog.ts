import { Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, maxLength, validate, requiredError, minLengthError } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { GoalFormDialogData } from '../../models/goal-form-dialog-data.model';
import type { GoalFormResult } from '../../models/goal-form-result.model';
import { TITLE_MAX_LENGTH } from '../../../../shared/constants/text-length.const';
import { moneyAmount } from '../../../../shared/validators/money-amount';

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
    validate(path.title, ({ value }) => (value().trim() ? null : requiredError({ message: 'Title is required' })));
    validate(path.title, ({ value }) =>
      value().trim().length >= 3 ? null : minLengthError(3, { message: 'Title must be at least 3 characters' }),
    );
    maxLength(path.title, TITLE_MAX_LENGTH, { message: `Title cannot exceed ${TITLE_MAX_LENGTH} characters` });
    moneyAmount(path.rewardValue, 'Reward');
  });

  onSubmit(): void {
    const { title, rewardValue } = this.model();
    if (this.goalForm().valid() && rewardValue !== null) {
      this.dialogRef.close({ title, rewardValue });
    }
  }
}
