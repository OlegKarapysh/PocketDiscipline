import { Service, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

const SNACKBAR_DURATION_MS = 3000;
const SNACKBAR_ACTION_CLOSE = 'Close';
const MSG_UNKNOWN_ERROR = 'Unknown error occurred';

@Service()
export class SnackBarService {
  private snackBar = inject(MatSnackBar);

  show(message: string): void {
    this.snackBar.open(message, SNACKBAR_ACTION_CLOSE, { duration: SNACKBAR_DURATION_MS });
  }

  error(e: unknown, fallback: string = MSG_UNKNOWN_ERROR): void {
    this.show(e instanceof Error ? e.message : fallback);
  }
}
