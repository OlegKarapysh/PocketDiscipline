import { Component, inject, signal } from '@angular/core';
import { FormField, form, max, maxLength, min, required } from '@angular/forms/signals';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';
import { EMPTY, catchError, from } from 'rxjs';
import { WithdrawalService } from '../../services/withdrawal.service';
import { CategoryService } from '../../services/category.service';
import { UserService } from '../../../../core/services/user.service';
import type { User } from '../../../../core/models/user.model';
import type { RewardCategory } from '../../../../core/models/reward-category.model';
import { FALLBACK_CATEGORY_ID } from '../../../../core/constants/initial-reward-categories.const';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { MONEY_FORMAT } from '../../../../shared/constants/money-format.const';
import { Amount } from '../../../../shared/components/amount/amount';
import { Badge } from '../../../../shared/components/badge/badge';

interface QuickSpendModel {
  amount: number | null;
  title: string;
  categoryId: string;
  notes: string;
}

@Component({
  selector: 'app-quick-spend-dialog',
  imports: [
    FormField,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    Amount,
    Badge,
  ],
  templateUrl: './quick-spend-dialog.html',
  styleUrl: './quick-spend-dialog.scss',
})
export class QuickSpendDialog {
  private readonly dialogRef = inject(MatDialogRef<QuickSpendDialog>);
  private readonly withdrawalService = inject(WithdrawalService);
  private readonly categoryService = inject(CategoryService);
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(SnackBarService);

  readonly isSubmitting = signal(false);

  readonly user = toSignal(
    (from(this.userService.user$) as Observable<User | undefined>).pipe(
      catchError((err: unknown) => {
        this.snackBar.error(err, 'Failed to load balance');
        return EMPTY;
      }),
    ),
    { initialValue: undefined },
  );
  readonly categories = toSignal(
    this.categoryService.getCategories().pipe(
      catchError((err: unknown) => {
        this.snackBar.error(err, 'Failed to load categories');
        return EMPTY;
      }),
    ),
    { initialValue: [] as RewardCategory[] },
  );

  readonly model = signal<QuickSpendModel>({ amount: null, title: '', categoryId: FALLBACK_CATEGORY_ID, notes: '' });

  readonly spendForm = form(this.model, (path) => {
    required(path.amount, { message: 'Amount is required' });
    min(path.amount, 0.01, { message: 'Amount must be greater than zero' });
    max(path.amount, () => this.user()?.balance ?? 0, { message: 'Amount exceeds your available balance' });
    required(path.title, { message: 'Title is required' });
    maxLength(path.title, 100, { message: 'Title is too long' });
    required(path.categoryId, { message: 'Category is required' });
    maxLength(path.notes, 1000, { message: 'Notes are too long' });
  });

  async submit(): Promise<void> {
    const { amount, title, categoryId, notes } = this.model();
    if (this.spendForm().invalid() || this.isSubmitting() || amount === null) {
      return;
    }

    this.isSubmitting.set(true);

    try {
      const record = await this.withdrawalService.withdraw({
        amount,
        title,
        categoryId,
        notes: notes.trim() ? notes.trim() : undefined,
      });

      this.snackBar.show(`Withdrawn ${MONEY_FORMAT.format(record.amount)} ₴ for ${record.title}`);
      this.dialogRef.close(record);
    } catch (error) {
      this.snackBar.error(error, 'Withdrawal failed');
      this.isSubmitting.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
