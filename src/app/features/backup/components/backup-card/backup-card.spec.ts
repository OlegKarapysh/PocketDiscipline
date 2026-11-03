import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbService } from '../../../../database/db.service';
import { openEmptyDb } from '../../../../shared/testing/empty-db';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import type { ShareOutcome } from '../../models/share-outcome.type';
import { BackupExportService } from '../../services/backup-export.service';
import { FileSharingService } from '../../services/file-sharing.service';
import { BackupCard } from './backup-card';
import { ClockService } from '../../../../core/services/clock.service';
import { UserService } from '../../../../core/services/user.service';
import type { User } from '../../../../core/models/user.model';

describe('BackupCard', () => {
  let db: DbService;
  let fixture: ComponentFixture<BackupCard>;
  let sharing: {
    canShare: ReturnType<typeof vi.fn>;
    share: ReturnType<typeof vi.fn<(file: File) => Promise<ShareOutcome>>>;
    download: ReturnType<typeof vi.fn>;
  };
  let snackBar: { show: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let today: ReturnType<typeof signal<string>>;
  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent.replace(/\s+/g, ' ');
  const buttons = () => Array.from(element().querySelectorAll('button'));
  const primary = () => buttons()[0];
  const download = () => buttons()[1];
  const settle = async () => {
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(primary().disabled).toBe(false);
    });
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    sharing = {
      canShare: vi.fn().mockReturnValue(true),
      share: vi.fn<(file: File) => Promise<ShareOutcome>>().mockResolvedValue('shared'),
      download: vi.fn(),
    };
    snackBar = { show: vi.fn(), error: vi.fn() };
    today = signal('2026-01-04');
    TestBed.configureTestingModule({
      imports: [BackupCard],
      providers: [
        { provide: FileSharingService, useValue: sharing },
        { provide: SnackBarService, useValue: snackBar },
        { provide: ClockService, useValue: { today } },
      ],
    });
    db = await openEmptyDb();
    await db.users.put({ id: 1, name: 'Current', balance: 100, createdAt: 1, updatedAt: 1 });
    fixture = TestBed.createComponent(BackupCard);
    fixture.detectChanges();
    await settle();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shares the backup and returns to Export data', async () => {
    primary().click();
    await settle();
    expect(sharing.share).toHaveBeenCalledWith(expect.any(File));
    expect(snackBar.show).toHaveBeenCalledWith('Backup shared.');
    expect(primary().textContent).toContain('Export data');
    expect((await db.users.get(1))?.lastExportedAt).toEqual(expect.any(Number));
  });
  it('silently cancels without downloading', async () => {
    sharing.share.mockResolvedValue('cancelled');
    primary().click();
    await settle();
    expect(snackBar.show).not.toHaveBeenCalled();
    expect(sharing.download).not.toHaveBeenCalled();
    expect(primary().textContent).toContain('Export data');
    expect((await db.users.get(1))?.lastExportedAt).toBeUndefined();
  });
  it('offers a fresh tap and shares the same prepared file', async () => {
    sharing.share.mockResolvedValueOnce('needs-tap');
    primary().click();
    await settle();
    expect(text()).toContain('Your backup is ready to share.');
    expect(primary().textContent).toContain('Share');
    const file = sharing.share.mock.calls[0][0];
    primary().click();
    await settle();
    expect(sharing.share.mock.calls[1][0]).toBe(file);
    expect(snackBar.show).toHaveBeenCalledWith('Backup shared.');
  });
  it('does not loop when the second tap is also refused', async () => {
    sharing.share.mockResolvedValue('needs-tap');
    primary().click();
    await settle();
    primary().click();
    await settle();
    expect(primary().textContent).toContain('Export data');
    expect(snackBar.show).toHaveBeenCalledWith("Couldn't share the backup. Use Download instead.");
    expect(sharing.download).not.toHaveBeenCalled();
    expect((await db.users.get(1))?.lastExportedAt).toBeUndefined();
  });
  it('reports other share failures', async () => {
    sharing.share.mockRejectedValue(new Error('Failed'));
    primary().click();
    await settle();
    expect(snackBar.show).toHaveBeenCalledWith("Couldn't share the backup. Use Download instead.");
    expect(primary().textContent).toContain('Export data');
  });
  it('downloads when file sharing is unsupported', async () => {
    sharing.canShare.mockReturnValue(false);
    primary().click();
    await settle();
    expect(sharing.share).not.toHaveBeenCalled();
    expect(sharing.download).toHaveBeenCalledWith(expect.any(File));
    expect(snackBar.show).toHaveBeenCalledWith('Backup saved.');
    expect((await db.users.get(1))?.lastExportedAt).toEqual(expect.any(Number));
  });
  it('allows explicit download even when sharing is supported', async () => {
    download().click();
    await settle();
    expect(sharing.share).not.toHaveBeenCalled();
    expect(sharing.download).toHaveBeenCalledWith(expect.any(File));
  });
  it('downloads the prepared file in ready state', async () => {
    sharing.share.mockResolvedValue('needs-tap');
    primary().click();
    await settle();
    const file = sharing.share.mock.calls[0][0];
    download().click();
    await settle();
    expect(sharing.download).toHaveBeenCalledWith(file);
    expect(primary().textContent).toContain('Export data');
  });
  it('disables both actions and ignores a second export while preparing', async () => {
    let finish!: (file: File) => void;
    const file = new File(['{}'], 'backup.txt');
    const create = vi.spyOn(TestBed.inject(BackupExportService), 'createBackup').mockReturnValue(
      new Promise<File>((resolve) => {
        finish = resolve;
      }),
    );
    primary().click();
    fixture.detectChanges();
    expect(buttons().every((button) => button.disabled)).toBe(true);
    expect(element().querySelector('[aria-busy="true"]')).not.toBeNull();
    primary().click();
    download().click();
    expect(create).toHaveBeenCalledTimes(1);
    finish(file);
    await settle();
  });
  it('reports a failed database read', async () => {
    await db.delete();
    primary().click();
    await settle();
    expect(snackBar.error).toHaveBeenCalledWith(expect.anything(), "Couldn't prepare the backup.");
    expect(sharing.share).not.toHaveBeenCalled();
    expect(sharing.download).not.toHaveBeenCalled();
  });
  it('reports a download failure without recording the backup', async () => {
    sharing.download.mockImplementation(() => {
      throw new Error('Download blocked');
    });
    download().click();
    await settle();
    expect(snackBar.error).toHaveBeenCalledWith(expect.any(Error), "Couldn't download the backup.");
    expect((await db.users.get(1))?.lastExportedAt).toBeUndefined();
  });
  it('clears the prepared backup if user data changes while waiting to share', async () => {
    sharing.share.mockResolvedValueOnce('needs-tap');
    primary().click();
    await settle();
    expect(primary().textContent).toContain('Share');
    await db.users.update(1, { balance: 250 });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(primary().textContent).toContain('Export data');
    });
  });

  it.each([
    [undefined, 'Never'],
    [Number.NaN, 'Never'],
    [new Date(2026, 0, 4, 0, 1).getTime(), 'today'],
    [new Date(2026, 0, 3, 23, 59).getTime(), 'yesterday'],
    [new Date(2026, 0, 1, 12).getTime(), '3 days ago'],
    [new Date(2026, 0, 5, 12).getTime(), 'today'],
    [new Date(1970, 0, 1, 12).getTime(), '20457 days ago'],
  ])('shows the calendar age for %s as %s', async (lastExportedAt, wording) => {
    if (lastExportedAt !== undefined) await db.users.update(1, { lastExportedAt });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(text()).toContain(`Last backup: ${wording}`);
    });
  });

  it('treats epoch 0 as a valid timestamp rather than Never', async () => {
    today.set(new Date(0).toLocaleDateString('en-CA'));
    await db.users.update(1, { lastExportedAt: 0 });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(text()).toContain('Last backup: today');
    });
  });

  it('leaves the age blank until the user stream emits', () => {
    fixture.destroy();
    TestBed.resetTestingModule();
    const user$ = new Subject<User>();
    TestBed.configureTestingModule({
      imports: [BackupCard],
      providers: [
        { provide: UserService, useValue: { user$ } },
        { provide: SnackBarService, useValue: snackBar },
        { provide: ClockService, useValue: { today } },
      ],
    });
    fixture = TestBed.createComponent(BackupCard);
    fixture.detectChanges();
    expect(text()).not.toContain('Last backup:');
    user$.next({ id: 1, name: 'Current', balance: 0, createdAt: 1, updatedAt: 1 });
    fixture.detectChanges();
    expect(text()).toContain('Last backup: Never');
  });

  it('updates the age live after download and when the calendar day changes', async () => {
    vi.setSystemTime(new Date(2026, 0, 4, 12));
    download().click();
    await settle();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(text()).toContain('Last backup: today');
    });
    today.set('2026-01-05');
    fixture.detectChanges();
    expect(text()).toContain('Last backup: yesterday');
  });
});
