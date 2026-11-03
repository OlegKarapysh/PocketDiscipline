import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, from, tap } from 'rxjs';
import { ClockService } from '../../../../core/services/clock.service';
import { UserService } from '../../../../core/services/user.service';
import { DATE_LOCALE_CA } from '../../../../core/constants/date-locale.const';
import { ONE_DAY_MS } from '../../../../core/constants/one-day-ms.const';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import type { BackupFile } from '../../models/backup-file.model';
import type { BackupState } from '../../models/backup-state.type';
import type { ShareOutcome } from '../../models/share-outcome.type';
import { BackupExportService } from '../../services/backup-export.service';
import { FileSharingService } from '../../services/file-sharing.service';

@Component({
  imports: [SectionCard, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  selector: 'app-backup-card',
  styleUrl: './backup-card.scss',
  templateUrl: './backup-card.html',
})
export class BackupCard {
  private readonly backup = inject(BackupExportService);
  private readonly sharing = inject(FileSharingService);
  private readonly snackBar = inject(SnackBarService);
  private readonly clock = inject(ClockService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = signal<BackupState>('idle');
  private readonly prepared = signal<BackupFile | undefined>(undefined);

  readonly preparing = computed(() => this.state() === 'preparing');
  readonly ready = computed(() => this.state() === 'ready');
  readonly primaryLabel = computed(() => (this.ready() ? 'Share' : 'Export data'));

  private readonly user = toSignal(
    from(this.userService.user$).pipe(
      tap(() => {
        if (this.ready()) {
          this.reset();
        }
      }),
      catchError((error: unknown) => {
        this.snackBar.error(error, 'Failed to load last backup.');
        return EMPTY;
      }),
    ),
  );

  readonly lastBackup = computed<{ days?: number; label: string } | undefined>(() => {
    const user = this.user();
    if (user === undefined) return undefined;
    if (user.lastExportedAt === undefined || !Number.isFinite(user.lastExportedAt)) return { label: 'Never' };
    const date = new Date(user.lastExportedAt).toLocaleDateString(DATE_LOCALE_CA);
    const days = Math.round((Date.parse(this.clock.today()) - Date.parse(date)) / ONE_DAY_MS);
    if (!Number.isFinite(days)) return { label: 'Never' };
    return days <= 0 ? { label: 'today' } : days === 1 ? { label: 'yesterday' } : { days, label: 'days ago' };
  });

  async export(): Promise<void> {
    if (this.preparing()) return;
    const prepared = this.prepared();
    if (this.ready() && prepared) {
      this.state.set('preparing');
      await this.share(prepared, false);
      return;
    }
    this.state.set('preparing');
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
    if (this.preparing()) return;
    this.state.set('preparing');
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
  }
}
