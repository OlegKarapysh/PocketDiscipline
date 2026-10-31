import { EMPTY } from 'rxjs';

// For specs that mock MatSnackBar beneath the real SnackBarService: what their open() returns. The
// toast never opens, so the service attaches no gesture and reports no height.
// Usage: { provide: MatSnackBar, useValue: { open: vi.fn(fakeSnackBarRef) } }
export function fakeSnackBarRef() {
  return { afterOpened: () => EMPTY, afterDismissed: () => EMPTY, dismiss: () => undefined };
}
