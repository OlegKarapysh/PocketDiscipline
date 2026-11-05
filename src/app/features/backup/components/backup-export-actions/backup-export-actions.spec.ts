import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { UserService } from '../../../../core/services/user.service';
import { BackupExportService } from '../../services/backup-export.service';
import { FileSharingService } from '../../services/file-sharing.service';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { BackupExportActions } from './backup-export-actions';

describe('BackupExportActions', () => {
  it('supports custom labels, external disabling, busy coordination and download recording', async () => {
    const createBackup = vi.fn().mockResolvedValue(new File(['{}'], 'backup.txt'));
    const recordExport = vi.fn().mockResolvedValue(undefined);
    const download = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { user$: of(undefined) } },
        { provide: BackupExportService, useValue: { createBackup, recordExport } },
        { provide: FileSharingService, useValue: { download, canShare: () => false } },
        { provide: SnackBarService, useValue: { show: vi.fn(), error: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(BackupExportActions);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Export data');
    fixture.componentRef.setInput('primaryLabel', 'Export current data');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')?.disabled).toBe(true);
    await fixture.componentInstance.export();
    expect(createBackup).not.toHaveBeenCalled();
    fixture.componentRef.setInput('disabled', false);
    const busy: boolean[] = [];
    fixture.componentInstance.busy.subscribe((value) => busy.push(value));
    await fixture.componentInstance.export();
    expect(download).toHaveBeenCalledWith(expect.any(File));
    expect(recordExport).toHaveBeenCalled();
    expect(busy).toEqual([true, false]);
  });
});
