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
  template: `
    <h2 mat-dialog-title>Pomodoro Completed!</h2>
    <mat-dialog-content>
      <p>Great job focusing on your {{ data.engagementType }} session.</p>
      <p class="reward">You earned <strong>{{ data.reward }}</strong> points!</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Awesome</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .reward {
      font-size: 1.2rem;
      color: #4caf50;
      margin-top: 1rem;
    }
  `]
})
export class CompletionDialog {
  public dialogRef = inject(MatDialogRef<CompletionDialog>);
  public data = inject<CompletionDialogData>(MAT_DIALOG_DATA);
}
