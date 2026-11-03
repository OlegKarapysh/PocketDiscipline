import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, from } from 'rxjs';
import { ClockService } from '../../../../core/services/clock.service';
import { UserService } from '../../../../core/services/user.service';
import { DATE_LOCALE_CA } from '../../../../core/constants/date-locale.const';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import type { BackupFile } from '../../models/backup-file.model';
import type { BackupState } from '../../models/backup-state.type';
import { BackupExportService } from '../../services/backup-export.service';
import { FileSharingService } from '../../services/file-sharing.service';

const ONE_DAY_MS = 86_400_000;

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
  private readonly user = toSignal(
    from(this.userService.user$).pipe(
      catchError((error: unknown) => {
        this.snackBar.error(error, 'Failed to load last backup.');
        return EMPTY;
      }),
    ),
  );
  private readonly state = signal<BackupState>('idle');
  private readonly prepared = signal<BackupFile | undefined>(undefined);

  readonly preparing = computed(() => this.state() === 'preparing');
  readonly ready = computed(() => this.state() === 'ready');
  readonly primaryLabel = computed(() => (this.ready() ? 'Share' : 'Export data'));
  readonly lastBackup = computed<{ days?: number; label: string } | undefined>(() => {
    const user = this.user();
    if (user === undefined) return undefined;
    if (user.lastExportedAt === undefined) return { label: 'Never' };
    const date = new Date(user.lastExportedAt).toLocaleDateString(DATE_LOCALE_CA);
    const days = Math.round((Date.parse(this.clock.today()) - Date.parse(date)) / ONE_DAY_MS);
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
    let file: BackupFile;
    let canShare: boolean;
    try {
      canShare = this.sharing.canShare(new File([], 'pocket-discipline-2000-01-01-0000.txt', { type: 'text/plain' }));
      file = await this.backup.createBackup();
    } catch (error) {
      this.snackBar.error(error, "Couldn't prepare the backup.");
      this.reset();
      return;
    }
    if (canShare) {
      await this.share(file, true);
    } else {
      await this.save(file);
    }
  }

  async download(): Promise<void> {
    if (this.preparing()) return;
    this.state.set('preparing');
    let file: BackupFile;
    try {
      file = this.prepared() ?? (await this.backup.createBackup());
    } catch (error) {
      this.snackBar.error(error, "Couldn't prepare the backup.");
      this.reset();
      return;
    }
    await this.save(file);
  }

  private async share(file: BackupFile, allowRetry: boolean): Promise<void> {
    try {
      const outcome = await this.sharing.share(file);
      if (outcome === 'needs-tap') {
        if (allowRetry) {
          this.prepared.set(file);
          this.state.set('ready');
          return;
        }
        this.snackBar.show("Couldn't share the backup. Use Download instead.");
      } else if (outcome === 'shared') {
        await this.backup.recordExport();
        this.snackBar.show('Backup shared.');
      }
    } catch {
      this.snackBar.show("Couldn't share the backup. Use Download instead.");
    }
    this.reset();
  }

  private async save(file: BackupFile): Promise<void> {
    try {
      this.sharing.download(file);
      await this.backup.recordExport();
      this.snackBar.show('Backup saved.');
    } catch (error) {
      this.snackBar.error(error, "Couldn't download the backup.");
    }
    this.reset();
  }

  private reset(): void {
    this.prepared.set(undefined);
    this.state.set('idle');
  }
}
