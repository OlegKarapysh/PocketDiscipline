import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { CelebrationService } from './celebration.service';
import { CelebrationDialog } from '../components/celebration-dialog/celebration-dialog';
import type { CelebrationDialogData } from '../components/celebration-dialog/celebration-dialog-data.model';
import type { CelebrationResult } from '../components/celebration-dialog/celebration-result.type';

describe('CelebrationService', () => {
  let service: CelebrationService;
  let dialogMock: { open: ReturnType<typeof vi.fn> };

  const data: CelebrationDialogData = { title: 'Goal complete', amount: 1500, canUndo: true };

  const mockAfterClosed = (value: CelebrationResult | undefined) => {
    dialogMock.open.mockReturnValue({ afterClosed: () => of(value) });
  };

  beforeEach(() => {
    dialogMock = { open: vi.fn() };

    TestBed.configureTestingModule({
      providers: [CelebrationService, { provide: MatDialog, useValue: dialogMock }],
    });

    service = TestBed.inject(CelebrationService);
  });

  it('should open the celebration dialog with the given data', () => {
    mockAfterClosed('dismissed');

    service.show(data).subscribe();

    expect(dialogMock.open).toHaveBeenCalledWith(CelebrationDialog, expect.objectContaining({ data }));
  });

  it('should emit undo when the user undoes', () => {
    mockAfterClosed('undo');
    const next = vi.fn();

    service.show(data).subscribe(next);

    expect(next).toHaveBeenCalledWith('undo');
  });

  it('should emit dismissed when the dialog closes without a result', () => {
    mockAfterClosed(undefined);
    const next = vi.fn();

    service.show(data).subscribe(next);

    expect(next).toHaveBeenCalledWith('dismissed');
  });
});
