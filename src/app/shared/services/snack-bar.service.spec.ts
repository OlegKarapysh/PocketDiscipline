import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackBarService } from './snack-bar.service';

describe('SnackBarService', () => {
  let service: SnackBarService;
  let matSnackBarMock: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    matSnackBarMock = { open: vi.fn() };

    TestBed.configureTestingModule({
      providers: [SnackBarService, { provide: MatSnackBar, useValue: matSnackBarMock }],
    });

    service = TestBed.inject(SnackBarService);
  });

  it('should open the snackbar with the Close action and the shared duration', () => {
    service.show('Goal added');

    expect(matSnackBarMock.open).toHaveBeenCalledWith('Goal added', 'Close', { duration: 3000 });
  });

  it('should surface the message of an Error', () => {
    service.error(new Error('A goal with this title already exists.'));

    expect(matSnackBarMock.open).toHaveBeenCalledWith(
      'A goal with this title already exists.',
      'Close',
      { duration: 3000 }
    );
  });

  it('should fall back to a generic message for a non-Error', () => {
    service.error('something went wrong');

    expect(matSnackBarMock.open).toHaveBeenCalledWith('Unknown error occurred', 'Close', {
      duration: 3000,
    });
  });

  it('should use a caller-supplied fallback for a non-Error', () => {
    service.error(undefined, 'Failed to load categories');

    expect(matSnackBarMock.open).toHaveBeenCalledWith('Failed to load categories', 'Close', {
      duration: 3000,
    });
  });

  it('should prefer the Error message over a caller-supplied fallback', () => {
    service.error(new Error('Delete failed'), 'Failed to delete');

    expect(matSnackBarMock.open).toHaveBeenCalledWith('Delete failed', 'Close', { duration: 3000 });
  });
});
