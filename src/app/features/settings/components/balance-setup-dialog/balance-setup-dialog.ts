import { Component, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { moneyAmount } from '../../../../shared/validators/money-amount';

// Opened with the current balance and closed with the new one; the caller confirms and saves it.
@Component({
  selector: 'app-balance-setup-dialog',
  imports: [FormField, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './balance-setup-dialog.html',
  styleUrl: './balance-setup-dialog.scss',
})
export class BalanceSetupDialog {
  private readonly dialogRef = inject(MatDialogRef<BalanceSetupDialog, number>);

  readonly model = signal<{ amount: number | null }>({ amount: inject<number>(MAT_DIALOG_DATA) });

  readonly balanceForm = form(this.model, (path) => {
    moneyAmount(path.amount, 'Balance', 0);
  });

  submit(): void {
    const { amount } = this.model();
    if (this.balanceForm().invalid() || amount === null) {
      return;
    }

    this.dialogRef.close(amount);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
