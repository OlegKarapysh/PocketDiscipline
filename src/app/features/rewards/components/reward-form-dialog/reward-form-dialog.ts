import type { OnInit} from '@angular/core';
import { Component, inject, signal } from '@angular/core';

import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { RewardsService } from '../../services/rewards.service';
import { CategoryService } from '../../services/category.service';

import type { RewardCategory } from '../../../../core/models/reward-category.model';
import type { RewardType } from '../../../../core/models/reward-type.type';
import { FALLBACK_CATEGORY_ID } from '../../../../core/constants/initial-reward-categories.const';
import type { RewardFormDialogData } from './reward-form-dialog-data.model';

export type { RewardFormDialogData };

@Component({
  selector: 'app-reward-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './reward-form-dialog.html',
  styleUrl: './reward-form-dialog.scss',
})
export class RewardFormDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<RewardFormDialogComponent>);
  private readonly data = inject<RewardFormDialogData>(MAT_DIALOG_DATA, { optional: true });
  private readonly rewardsService = inject(RewardsService);
  private readonly categoryService = inject(CategoryService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isSubmitting = signal(false);
  readonly isEditing = signal(false);

  readonly categories = toSignal(this.categoryService.getCategories(), { initialValue: [] as RewardCategory[] });

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [(control) => Validators.required(control), (control) => Validators.maxLength(100)(control)] }),
    cost: new FormControl<number | null>(null, [
      (control) => Validators.required(control),
      (control) => Validators.min(0.01)(control),
    ]),
    categoryId: new FormControl(FALLBACK_CATEGORY_ID, { nonNullable: true, validators: [(control) => Validators.required(control)] }),
    type: new FormControl<RewardType>('repeatable', { nonNullable: true, validators: [(control) => Validators.required(control)] }),
  });

  ngOnInit(): void {
    const existing = this.data?.reward;
    if (existing) {
      this.isEditing.set(true);
      this.form.setValue({
        title: existing.title,
        cost: existing.cost,
        categoryId: existing.categoryId,
        type: existing.type,
      });
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    const raw = this.form.getRawValue();
    if (raw.cost === null) {
      return;
    }

    this.isSubmitting.set(true);

    const payload = {
      title: raw.title,
      cost: raw.cost,
      categoryId: raw.categoryId,
      type: raw.type,
    };

    try {
      if (this.isEditing() && this.data?.reward) {
        const updated = await this.rewardsService.updateReward(this.data.reward.id, payload);
        this.snackBar.open(`Updated reward "${updated.title}"`, 'Close', { duration: 3000 });
        this.dialogRef.close(updated);
      } else {
        const created = await this.rewardsService.createReward(payload);
        this.snackBar.open(`Created reward "${created.title}"`, 'Close', { duration: 3000 });
        this.dialogRef.close(created);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      this.snackBar.open(message, 'Close', { duration: 3000 });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
