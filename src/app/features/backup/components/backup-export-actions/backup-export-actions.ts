import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { from } from 'rxjs';
import { UserService } from '../../../../core/services/user.service';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { BackupExportService } from '../../services/backup-export.service';
import { FileSharingService } from '../../services/file-sharing.service';
import type { BackupFile } from '../../models/backup-file.model';
import type { BackupState } from '../../models/backup-state.type';
import type { ShareOutcome } from '../../models/share-outcome.type';
@Component({
  selector: 'app-backup-export-actions',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './backup-export-actions.html',
  styleUrl: './backup-export-actions.scss',
})
export class BackupExportActions {
  readonly primaryLabel = input('Export data');
  readonly disabled = input(false);
  readonly busy = output<boolean>();
  private readonly backup = inject(BackupExportService);
  private readonly sharing = inject(FileSharingService);
  private readonly snackBar = inject(SnackBarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = signal<BackupState>('idle');
  private readonly prepared = signal<BackupFile | undefined>(undefined);
  readonly preparing = computed(() => this.state() === 'preparing');
  readonly ready = computed(() => this.state() === 'ready');
  readonly label = computed(() => (this.ready() ? 'Share' : this.primaryLabel()));
  constructor() {
    from(inject(UserService).user$)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          if (this.ready()) this.reset();
        },
        error: () => {
          this.reset();
        },
      });
  }
  async export(): Promise<void> {
    if (this.preparing() || this.disabled()) return;
    const prepared = this.prepared();
    if (this.ready() && prepared) {
      this.state.set('preparing');
      this.busy.emit(true);
      await this.share(prepared, false);
      return;
    }
    this.state.set('preparing');
    this.busy.emit(true);
    const canShare = this.sharing.canShare();
    const file = await this.prepare();
    if (!file) return;
    if (canShare) {
      await this.share(file, true);
    } else {
      await this.save(file);
    }
  }

  async download(): Promise<void> {
    if (this.preparing() || this.disabled()) return;
    this.state.set('preparing');
    this.busy.emit(true);
    const file = this.prepared() ?? (await this.prepare());
    if (!file) return;
    await this.save(file);
  }

  // Undefined when the card was destroyed meanwhile or the backup failed; the failure is already reported.
  private async prepare(): Promise<BackupFile | undefined> {
    try {
      const file = await this.backup.createBackup();
      return this.destroyed() ? undefined : file;
    } catch (error) {
      if (this.destroyed()) return undefined;
      this.snackBar.error(error, "Couldn't prepare the backup.");
      this.reset();
      return undefined;
    }
  }

  private async share(file: BackupFile, allowRetry: boolean): Promise<void> {
    let outcome: ShareOutcome;
    try {
      outcome = await this.sharing.share(file);
    } catch {
      if (this.destroyed()) return;
      this.snackBar.show("Couldn't share the backup. Use Download instead.");
      this.reset();
      return;
    }
    if (this.destroyed()) return;
    if (outcome === 'needs-tap') {
      if (allowRetry) {
        this.prepared.set(file);
        this.state.set('ready');
        this.busy.emit(false);
        return;
      }
      this.snackBar.show("Couldn't share the backup. Use Download instead.");
    } else if (outcome === 'shared') {
      await this.backup.recordExport().catch(() => undefined);
      if (this.destroyed()) return;
      this.snackBar.show('Backup shared.');
    }
    this.reset();
  }

  private async save(file: BackupFile): Promise<void> {
    try {
      this.sharing.download(file);
    } catch (error) {
      this.snackBar.error(error, "Couldn't download the backup.");
      this.reset();
      return;
    }
    await this.backup.recordExport().catch(() => undefined);
    if (this.destroyed()) return;
    this.snackBar.show('Backup saved.');
    this.reset();
  }

  // A method, not a property read: TypeScript would keep a property narrowed across an await.
  private destroyed(): boolean {
    return this.destroyRef.destroyed;
  }

  private reset(): void {
    this.prepared.set(undefined);
    this.state.set('idle');
    this.busy.emit(false);
  }
}
