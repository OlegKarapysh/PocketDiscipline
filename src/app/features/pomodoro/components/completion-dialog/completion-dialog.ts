import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface CompletionDialogData {
  reward: number;
  engagementType: string;
}

@Component({
  selector: 'app-completion-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './completion-dialog.html',
  styleUrl: './completion-dialog.scss',
})
export class CompletionDialog {
  public dialogRef = inject(MatDialogRef<CompletionDialog>);
  public data = inject<CompletionDialogData>(MAT_DIALOG_DATA);
}
