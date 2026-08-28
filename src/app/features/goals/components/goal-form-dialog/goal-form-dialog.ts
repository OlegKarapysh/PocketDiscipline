import { Component, inject } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Goal } from '../../models/goal.model';

const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 100;
const MIN_REWARD_VALUE = 1;
const MAX_REWARD_VALUE = 10_000_000;

export interface GoalFormDialogData {
  goal?: Goal;
}

@Component({
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  selector: 'app-goal-form-dialog',
  styleUrl: './goal-form-dialog.scss',
  templateUrl: './goal-form-dialog.html',
})
export class GoalFormDialog {
  private fb = inject(FormBuilder);
  public data: GoalFormDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<GoalFormDialog>);

  form: FormGroup = this.fb.group({
    title: [
      this.data.goal?.title || '',
      [Validators.required, Validators.minLength(MIN_TITLE_LENGTH), Validators.maxLength(MAX_TITLE_LENGTH)],
    ],
    rewardValue: [
      this.data.goal?.rewardValue || null,
      [Validators.required, Validators.min(MIN_REWARD_VALUE), Validators.max(MAX_REWARD_VALUE)],
    ],
  });

  onSubmit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
