import { Service, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

const SNACKBAR_DURATION_MS = 3000;

@Service()
export class SnackBarService {
  private snackBar = inject(MatSnackBar);

  show(message: string): void {
    this.snackBar.open(message, 'Close', { duration: SNACKBAR_DURATION_MS });
  }

  error(e: unknown, fallback = 'Unknown error occurred'): void {
    this.show(e instanceof Error ? e.message : fallback);
  }
}
