import { BackupExportActions } from '../backup-export-actions/backup-export-actions';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, from } from 'rxjs';
import { ClockService } from '../../../../core/services/clock.service';
import { UserService } from '../../../../core/services/user.service';
import { DATE_LOCALE_CA } from '../../../../core/constants/date-locale.const';
import { ONE_DAY_MS } from '../../../../core/constants/one-day-ms.const';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';

@Component({
  imports: [SectionCard, BackupExportActions],
  selector: 'app-backup-card',
  styleUrl: './backup-card.scss',
  templateUrl: './backup-card.html',
})
export class BackupCard {
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

  readonly lastBackup = computed<{ days?: number; label: string } | undefined>(() => {
    const user = this.user();
    if (user === undefined) return undefined;
    if (user.lastExportedAt === undefined || !Number.isFinite(user.lastExportedAt)) return { label: 'Never' };
    const date = new Date(user.lastExportedAt).toLocaleDateString(DATE_LOCALE_CA);
    const days = Math.round((Date.parse(this.clock.today()) - Date.parse(date)) / ONE_DAY_MS);
    if (!Number.isFinite(days)) return { label: 'Never' };
    return days <= 0 ? { label: 'today' } : days === 1 ? { label: 'yesterday' } : { days, label: 'days ago' };
  });
}
