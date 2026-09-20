import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { WithdrawalService } from '../../services/withdrawal.service';
import { CategoryService } from '../../services/category.service';
import { UserService } from '../../../../core/services/user.service';
import type { User } from '../../../../core/models/user.model';
import type { RewardCategory } from '../../models/reward-category.model';
import { FALLBACK_CATEGORY_ID } from '../../../../core/constants/initial-reward-categories.const';

@Component({
  selector: 'app-quick-spend-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    DecimalPipe,
  ],
  templateUrl: './quick-spend-dialog.html',
  styleUrl: './quick-spend-dialog.scss',
})
export class QuickSpendDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<QuickSpendDialogComponent>);
  private readonly withdrawalService = inject(WithdrawalService);
  private readonly categoryService = inject(CategoryService);
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isSubmitting = signal(false);

  readonly user = toSignal(from(this.userService.user$) as Observable<User | undefined>, {
    initialValue: undefined,
  });
  readonly categories = toSignal(this.categoryService.getCategories(), { initialValue: [] as RewardCategory[] });

  readonly form = new FormGroup({
    amount: new FormControl<number | null>(null, [
      (control) => Validators.required(control),
      (control) => Validators.min(0.01)(control),
      (control) => {
        const val = typeof control.value === 'number' ? control.value : null;
        const max = this.user()?.balance ?? 0;
        return (val ?? 0) > max ? { max: { max, actual: val } } : null;
      },
    ]),
    title: new FormControl('', { nonNullable: true, validators: [(control) => Validators.required(control), (control) => Validators.maxLength(100)(control)] }),
    categoryId: new FormControl(FALLBACK_CATEGORY_ID, { nonNullable: true, validators: [(control) => Validators.required(control)] }),
    notes: new FormControl('', { nonNullable: true, validators: [(control) => Validators.maxLength(1000)(control)] }),
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    const raw = this.form.getRawValue();
    const balance = this.user()?.balance ?? 0;

    if (!raw.amount || raw.amount > balance) {
      this.snackBar.open('Amount exceeds current balance', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting.set(true);

    try {
      const record = await this.withdrawalService.withdraw({
        amount: raw.amount,
        title: raw.title,
        categoryId: raw.categoryId,
        notes: raw.notes.trim() ? raw.notes.trim() : undefined,
      });

      this.snackBar.open(`Withdrawn ${String(record.amount)} ₴ for ${record.title}`, 'Close', { duration: 3000 });
      this.dialogRef.close(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Withdrawal failed';
      this.snackBar.open(message, 'Close', { duration: 3000 });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
