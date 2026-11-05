import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { BackupImportService } from '../../services/backup-import.service';
import type { ValidatedBackup } from '../../models/validated-backup.model';
import type { BackupImportState } from '../../models/backup-import-state.type';
import type { DeviceSnapshot } from '../../models/device-snapshot.model';
import type { BackupComparison } from '../../models/backup-comparison.model';
import { BackupImportError } from '../../models/backup-import-error.model';
import { BACKUP_TABLES } from '../../validation/backup-schema.const';
import { Amount } from '../../../../shared/components/amount/amount';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { BackupExportActions } from '../../components/backup-export-actions/backup-export-actions';

@Component({
  selector: 'app-data-import-page',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeader,
    SectionCard,
    Amount,
    BackupExportActions,
  ],
  templateUrl: './data-import-page.html',
  styleUrl: './data-import-page.scss',
})
export class DataImportPage {
  private readonly importer = inject(BackupImportService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirm = inject(ConfirmService);
  private readonly snackBar = inject(SnackBarService);
  private readonly router = inject(Router);
  private generation = 0;
  readonly state = signal<BackupImportState>('idle');
  readonly error = signal<string | undefined>(undefined);
  readonly prepared = signal<ValidatedBackup | undefined>(undefined);
  readonly filename = signal('');
  private readonly baseline = signal<DeviceSnapshot | undefined>(undefined);
  readonly safetyBusy = signal(false);
  readonly busy = computed(
    () => this.safetyBusy() || ['checking', 'confirming', 'replacing', 'success'].includes(this.state()),
  );
  readonly comparison = computed<BackupComparison | undefined>(() => {
    const prepared = this.prepared();
    const current = this.baseline();
    if (!prepared || !current) return undefined;
    return {
      exportedAt: prepared.envelope.exportedAt,
      appVersion: prepared.envelope.appVersion,
      transformed: prepared.transformed,
      incomingBalance: prepared.balance,
      currentBalance: current.balance,
      rows: Object.entries(BACKUP_TABLES).map(([table, descriptor]) => ({
        table,
        label: descriptor.label,
        incoming: prepared.counts[table],
        current: current.counts[table],
      })),
    };
  });

  async selectFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (this.safetyBusy() || ['confirming', 'replacing', 'success'].includes(this.state())) return;
    if (!file) return;
    const generation = ++this.generation;
    this.prepared.set(undefined);
    this.baseline.set(undefined);
    this.error.set(undefined);
    this.filename.set(file.name);
    this.state.set('checking');
    try {
      const prepared = await this.importer.prepare(file);
      const baseline = await this.importer.snapshot();
      if (this.destroyed() || generation !== this.generation) return;
      this.baseline.set(baseline);
      this.prepared.set(prepared);
      this.state.set('review');
    } catch (error) {
      if (this.destroyed() || generation !== this.generation) return;
      this.error.set(error instanceof Error ? error.message : 'Could not check this backup. Select the file again.');
      this.state.set('error');
    }
  }

  async exportBusy(busy: boolean): Promise<void> {
    this.safetyBusy.set(true);
    if (busy) return;
    try {
      await this.refreshBaseline();
    } finally {
      if (!this.destroyed()) this.safetyBusy.set(false);
    }
  }

  async restore(): Promise<void> {
    const prepared = this.prepared();
    const baseline = this.baseline();
    if (this.busy() || !prepared || !baseline) return;
    this.error.set(undefined);
    this.state.set('confirming');
    let confirmed: boolean;
    try {
      confirmed = await firstValueFrom(
        this.confirm
          .ask({
            title: 'Replace all data?',
            message:
              'All data on this device will be replaced by this backup, including anything changed here since the file was exported.',
            confirmText: 'Replace data',
            cancelText: 'Cancel',
            isDestructive: true,
          })
          .pipe(takeUntilDestroyed(this.destroyRef)),
        { defaultValue: false },
      );
    } catch {
      this.state.set('review');
      return;
    }
    if (this.destroyed()) return;
    if (!confirmed) {
      this.state.set('review');
      return;
    }
    this.state.set('replacing');
    try {
      await this.importer.replace(prepared, baseline);
    } catch (error) {
      if (this.destroyed()) return;
      // Stays 'replacing' until the review shows current data, so Replace cannot run on a stale baseline.
      await this.refreshBaseline();
      this.state.set('review');
      // With no baseline there is nothing to confirm, and refreshBaseline has said to select the file again.
      if (!this.baseline()) return;
      this.error.set(
        error instanceof BackupImportError
          ? error.message
          : 'Could not restore the backup. Your data was preserved. Try again.',
      );
      return;
    }
    this.state.set('success');
    if (this.destroyed()) return;
    try {
      this.snackBar.show('Data restored.');
      if (!(await this.router.navigate(['/dashboard'])))
        this.error.set('Data restored. Open the dashboard to continue.');
    } catch {
      this.error.set('Data restored. Open the dashboard to continue.');
    }
  }

  private async refreshBaseline(): Promise<void> {
    const generation = this.generation;
    try {
      const baseline = await this.importer.snapshot();
      if (!this.destroyed() && generation === this.generation) this.baseline.set(baseline);
    } catch {
      if (!this.destroyed() && generation === this.generation) {
        this.baseline.set(undefined);
        this.error.set('Could not load current device data. Select the backup again to retry.');
      }
    }
  }

  private destroyed(): boolean {
    return this.destroyRef.destroyed;
  }
}
