import { Component, inject } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Goal } from '../../models/goal.model';

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
    title: [this.data.goal?.title || '', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    rewardValue: [
      this.data.goal?.rewardValue || null,
      [Validators.required, Validators.min(1), Validators.max(10000000)],
    ],
  });

  onSubmit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
