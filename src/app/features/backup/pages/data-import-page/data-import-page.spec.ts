import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { BackupImportError } from '../../models/backup-import-error.model';
import { BackupImportService } from '../../services/backup-import.service';
import type { ValidatedBackup } from '../../models/validated-backup.model';
import { backupFixture } from '../../testing/backup.fixture';
import { DataImportPage } from './data-import-page';
import { of, EMPTY } from 'rxjs';
import { Router } from '@angular/router';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import type { DeviceSnapshot } from '../../models/device-snapshot.model';

describe('DataImportPage', () => {
  const prepared: ValidatedBackup = { envelope: backupFixture(), transformed: false, counts: {}, balance: -12 };
  function setup() {
    const prepare = vi.fn<(file: File) => Promise<ValidatedBackup>>().mockResolvedValue(prepared);
    const baseline: DeviceSnapshot = { data: backupFixture().data, canonical: 'baseline', counts: {}, balance: 100 };
    const snapshot = vi.fn().mockResolvedValue(baseline);
    const replace = vi.fn().mockResolvedValue(undefined);
    const ask = vi.fn().mockReturnValue(of(true));
    const navigate = vi.fn().mockResolvedValue(true);
    const show = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: BackupImportService, useValue: { prepare, snapshot, replace } },
        { provide: ConfirmService, useValue: { ask } },
        { provide: Router, useValue: { navigate } },
        { provide: SnackBarService, useValue: { show } },
      ],
    });
    const fixture = TestBed.createComponent(DataImportPage);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['{}'], 'backup.txt')] });
    return { fixture, input, prepare, snapshot, replace, ask, navigate, show };
  }
  it('clears previous eligibility immediately and ignores stale selection results', async () => {
    const { fixture, input, prepare } = setup();
    let resolve!: (value: ValidatedBackup) => void;
    prepare.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const first = fixture.componentInstance.selectFile(input);
    prepare.mockRejectedValueOnce(new BackupImportError('invalid-json', 'Invalid backup.'));
    await fixture.componentInstance.selectFile(input);
    resolve(prepared);
    await first;
    expect(fixture.componentInstance.prepared()).toBeUndefined();
    expect(fixture.componentInstance.error()).toBe('Invalid backup.');
  });
  it('ignores a read result after destruction', async () => {
    const { fixture, input, prepare } = setup();
    let resolve!: (value: ValidatedBackup) => void;
    prepare.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const checking = fixture.componentInstance.selectFile(input);
    fixture.destroy();
    resolve(prepared);
    await checking;
    expect(fixture.componentInstance.prepared()).toBeUndefined();
  });
  it.each([
    'Could not read this backup.',
    'Encrypted backups are not supported yet.',
    'Update the app first to import this backup.',
  ])('shows rejection without eligibility: %s', async (message) => {
    const { fixture, input, prepare } = setup();
    prepare.mockRejectedValue(new Error(message));
    await fixture.componentInstance.selectFile(input);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(fixture.componentInstance.prepared()).toBeUndefined();
  });
  it('opens the picker from Choose backup, shows the file name and blocks reselection while checking', async () => {
    const { fixture, input, prepare } = setup();
    const element = fixture.nativeElement as HTMLElement;
    const choose = [...element.querySelectorAll('button')].find((button) =>
      button.textContent.includes('Choose backup'),
    )!;
    const click = vi.spyOn(input, 'click').mockImplementation(() => undefined);
    choose.click();
    expect(click).toHaveBeenCalledTimes(1);
    let resolve!: (value: ValidatedBackup) => void;
    prepare.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const checking = fixture.componentInstance.selectFile(input);
    fixture.detectChanges();
    expect(choose.disabled).toBe(true);
    expect(element.querySelector('.file-name')?.textContent).toContain('backup.txt');
    resolve(prepared);
    await checking;
    fixture.detectChanges();
    expect(choose.disabled).toBe(false);
  });
  it('resets the picker and permits selecting the same file again', async () => {
    const { fixture, input, prepare } = setup();
    await fixture.componentInstance.selectFile(input);
    expect(input.value).toBe('');
    await fixture.componentInstance.selectFile(input);
    expect(prepare).toHaveBeenCalledTimes(2);
  });
  it('uses explicit destructive consent and handles cancellation without an emission', async () => {
    const { fixture, input, ask, replace } = setup();
    await fixture.componentInstance.selectFile(input);
    ask.mockReturnValue(EMPTY);
    await fixture.componentInstance.restore();
    expect(ask).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'All data on this device will be replaced by this backup, including anything changed here since the file was exported.',
        isDestructive: true,
      }),
    );
    expect(replace).not.toHaveBeenCalled();
    expect(fixture.componentInstance.state()).toBe('review');
  });
  it('refuses restore when current data cannot be loaded', async () => {
    const { fixture, input, snapshot, replace } = setup();
    snapshot.mockRejectedValue(new Error('Read failed'));
    await fixture.componentInstance.selectFile(input);
    await fixture.componentInstance.restore();
    expect(replace).not.toHaveBeenCalled();
    expect(fixture.componentInstance.comparison()).toBeUndefined();
  });
  it('refreshes changed consent and blocks duplicate replacement taps', async () => {
    const { fixture, input, replace, snapshot } = setup();
    await fixture.componentInstance.selectFile(input);
    replace.mockRejectedValueOnce(new BackupImportError('device-changed', 'Device changed.'));
    await Promise.all([fixture.componentInstance.restore(), fixture.componentInstance.restore()]);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(snapshot).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.state()).toBe('review');
  });
  it('keeps the committed result when navigation fails', async () => {
    const { fixture, input, navigate, replace } = setup();
    await fixture.componentInstance.selectFile(input);
    navigate.mockRejectedValue(new Error('Navigation failed'));
    await fixture.componentInstance.restore();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.state()).toBe('success');
    expect(fixture.componentInstance.error()).toBe('Data restored. Open the dashboard to continue.');
  });
  it('retains the incoming selection and refreshes review after safety export without restoring', async () => {
    const { fixture, input, replace, snapshot } = setup();
    await fixture.componentInstance.selectFile(input);
    await fixture.componentInstance.exportBusy(true);
    expect(fixture.componentInstance.busy()).toBe(true);
    await fixture.componentInstance.exportBusy(false);
    expect(snapshot).toHaveBeenCalledTimes(2);
    expect(replace).not.toHaveBeenCalled();
    expect(fixture.componentInstance.prepared()).toBe(prepared);
  });
});
