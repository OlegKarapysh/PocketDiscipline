import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ConfirmService } from './confirm.service';
import { ConfirmDialog } from '../components/confirm-dialog/confirm-dialog';
import type { ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog-data.model';

describe('ConfirmService', () => {
  let service: ConfirmService;
  let dialogMock: { open: ReturnType<typeof vi.fn> };

  const data: ConfirmDialogData = {
    title: 'Delete Category',
    message: 'Are you sure?',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDestructive: true,
  };

  const mockAfterClosed = (value: boolean | undefined) => {
    dialogMock.open.mockReturnValue({ afterClosed: () => of(value) });
  };

  beforeEach(() => {
    dialogMock = { open: vi.fn() };

    TestBed.configureTestingModule({
      providers: [ConfirmService, { provide: MatDialog, useValue: dialogMock }],
    });

    service = TestBed.inject(ConfirmService);
  });

  it('should open the shared confirm dialog with the given data', () => {
    mockAfterClosed(true);

    service.ask(data).subscribe();

    expect(dialogMock.open).toHaveBeenCalledWith(
      ConfirmDialog,
      expect.objectContaining({ data, width: '400px' })
    );
  });

  it('should emit once when the user confirms', () => {
    mockAfterClosed(true);
    const next = vi.fn();

    service.ask(data).subscribe(next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should not emit when the user cancels', () => {
    mockAfterClosed(false);
    const next = vi.fn();

    service.ask(data).subscribe(next);

    expect(next).not.toHaveBeenCalled();
  });

  it('should not emit when the dialog is dismissed without a result', () => {
    mockAfterClosed(undefined);
    const next = vi.fn();

    service.ask(data).subscribe(next);

    expect(next).not.toHaveBeenCalled();
  });
});
