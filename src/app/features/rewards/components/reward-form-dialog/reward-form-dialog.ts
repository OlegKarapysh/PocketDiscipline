import { Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, min, required } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { RewardsService } from '../../services/rewards.service';
import { CategoryService } from '../../services/category.service';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';

import type { RewardCategory } from '../../../../core/models/reward-category.model';
import type { RewardType } from '../../../../core/models/reward-type.type';
import { FALLBACK_CATEGORY_ID } from '../../../../core/constants/initial-reward-categories.const';
import type { RewardFormDialogData } from './reward-form-dialog-data.model';

export type { RewardFormDialogData };

interface RewardFormModel {
  title: string;
  cost: number | null;
  categoryId: string;
  type: RewardType;
}

@Component({
  selector: 'app-reward-form-dialog',
  imports: [
    FormField,
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
export class RewardFormDialog {
  private readonly dialogRef = inject(MatDialogRef<RewardFormDialog>);
  private readonly data = inject<RewardFormDialogData>(MAT_DIALOG_DATA, { optional: true });
  private readonly rewardsService = inject(RewardsService);
  private readonly categoryService = inject(CategoryService);
  private readonly snackBar = inject(SnackBarService);

  readonly isSubmitting = signal(false);
  readonly isEditing = signal(!!this.data?.reward);

  readonly categories = toSignal(this.categoryService.getCategories(), { initialValue: [] as RewardCategory[] });

  readonly model = signal<RewardFormModel>(this.initialModel());

  readonly rewardForm = form(this.model, (path) => {
    required(path.title, { message: 'Title is required' });
    maxLength(path.title, 100, { message: 'Title is too long' });
    required(path.cost, { message: 'Cost is required' });
    min(path.cost, 0.01, { message: 'Cost must be greater than zero' });
    required(path.categoryId, { message: 'Category is required' });
  });

  async submit(): Promise<void> {
    const { title, cost, categoryId, type } = this.model();
    if (this.rewardForm().invalid() || this.isSubmitting() || cost === null) {
      return;
    }

    this.isSubmitting.set(true);
    const payload = { title, cost, categoryId, type };

    try {
      const existing = this.data?.reward;
      if (existing) {
        const updated = await this.rewardsService.updateReward(existing.id, payload);
        this.snackBar.show(`Updated reward "${updated.title}"`);
        this.dialogRef.close(updated);
      } else {
        const created = await this.rewardsService.createReward(payload);
        this.snackBar.show(`Created reward "${created.title}"`);
        this.dialogRef.close(created);
      }
    } catch (error) {
      this.snackBar.error(error, 'Operation failed');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private initialModel(): RewardFormModel {
    const existing = this.data?.reward;
    if (existing) {
      return { title: existing.title, cost: existing.cost, categoryId: existing.categoryId, type: existing.type };
    }
    return { title: '', cost: null, categoryId: FALLBACK_CATEGORY_ID, type: 'repeatable' };
  }
}
