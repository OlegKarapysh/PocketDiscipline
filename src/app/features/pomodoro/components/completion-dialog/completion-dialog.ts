import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CompletionDialogData } from '../../models/completion-dialog-data.model';

@Component({
  selector: 'app-completion-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './completion-dialog.html',
  styleUrl: './completion-dialog.scss',
})
export class CompletionDialog {
  readonly dialogRef = inject(MatDialogRef<CompletionDialog>);
  readonly data = inject<CompletionDialogData>(MAT_DIALOG_DATA);
}
