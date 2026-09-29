import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Amount } from '../amount/amount';
import type { CelebrationDialogData } from './celebration-dialog-data.model';

@Component({
  selector: 'app-celebration-dialog',
  imports: [MatDialogModule, MatButtonModule, Amount],
  templateUrl: './celebration-dialog.html',
  styleUrl: './celebration-dialog.scss',
})
export class CelebrationDialog {
  readonly data = inject<CelebrationDialogData>(MAT_DIALOG_DATA);
}
