import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbService } from '../../../../database/db.service';
import { openEmptyDb } from '../../../../shared/testing/empty-db';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { FileSharingService } from '../../services/file-sharing.service';
import { BackupExportActions } from './backup-export-actions';

// The share, cancel, retry and failure flows are covered through BackupCard, which hosts this
// component; this spec covers what only its own inputs and output add.
describe('BackupExportActions', () => {
  let db: DbService;
  let fixture: ComponentFixture<BackupExportActions>;
  let sharing: { canShare: ReturnType<typeof vi.fn>; download: ReturnType<typeof vi.fn> };
  let busy: boolean[];

  const buttons = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
  const primary = () => buttons()[0];
  const download = () => buttons()[1];
  const setInput = async (name: string, value: unknown) => {
    fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const exportFinished = async () => {
    await vi.waitFor(() => {
      expect(busy.at(-1)).toBe(false);
    });
    fixture.detectChanges();
  };

  beforeEach(async () => {
    sharing = { canShare: vi.fn().mockReturnValue(false), download: vi.fn() };
    TestBed.configureTestingModule({
      imports: [BackupExportActions],
      providers: [
        { provide: FileSharingService, useValue: sharing },
        { provide: SnackBarService, useValue: { show: vi.fn(), error: vi.fn() } },
      ],
    });
    db = await openEmptyDb();
    await db.users.put({ id: 1, name: 'Current', balance: 100, createdAt: 1, updatedAt: 1 });
    fixture = TestBed.createComponent(BackupExportActions);
    busy = [];
    fixture.componentInstance.busy.subscribe((value) => busy.push(value));
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('labels the primary action "Export data" unless the host names it', async () => {
    expect(primary().textContent).toContain('Export data');

    await setInput('primaryLabel', 'Export current data');

    expect(primary().textContent).toContain('Export current data');
    expect(primary().textContent).not.toContain('Export data');
  });

  it('disables both actions while the host disables it', async () => {
    await setInput('disabled', true);

    expect(primary().disabled).toBe(true);
    expect(download().disabled).toBe(true);

    await setInput('disabled', false);

    expect(primary().disabled).toBe(false);
    expect(download().disabled).toBe(false);
  });

  it('tells the host it is busy for the length of an export', async () => {
    primary().click();
    expect(busy).toEqual([true]);

    await exportFinished();

    expect(busy).toEqual([true, false]);
    expect(sharing.download).toHaveBeenCalledWith(expect.any(File));
    expect((await db.users.get(1))?.lastExportedAt).toEqual(expect.any(Number));
  });

  it('tells the host it is no longer busy when the export fails', async () => {
    sharing.download.mockImplementation(() => {
      throw new Error('Blocked');
    });

    download().click();
    await exportFinished();

    expect(busy).toEqual([true, false]);
    expect(primary().disabled).toBe(false);
    expect((await db.users.get(1))?.lastExportedAt).toBeUndefined();
  });
});
