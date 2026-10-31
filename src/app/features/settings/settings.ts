import { Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import type { Observable } from 'rxjs';
import { EMPTY, catchError, filter, from, map, switchMap } from 'rxjs';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { ConfirmService } from '../../shared/services/confirm.service';
import { SnackBarService } from '../../shared/services/snack-bar.service';
import { MONEY_FORMAT } from '../../shared/constants/money-format.const';
import { UserService } from '../../core/services/user.service';
import type { User } from '../../core/models/user.model';
import { DatabasePurgeService } from './services/database-purge.service';
import { BalanceSetupDialog } from './components/balance-setup-dialog/balance-setup-dialog';
import { PomodoroRewardSettings } from '../pomodoro/components/pomodoro-reward-settings/pomodoro-reward-settings';

@Component({
  imports: [RouterLink, MatButtonModule, MatIconModule, PageHeader, PomodoroRewardSettings],
  selector: 'app-settings',
  styleUrl: './settings.scss',
  templateUrl: './settings.html',
})
export class Settings {
  private confirmService = inject(ConfirmService);
  private purgeService = inject(DatabasePurgeService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private snackBar = inject(SnackBarService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  private readonly user = toSignal(
    (from(this.userService.user$) as Observable<User | undefined>).pipe(
      catchError((err: unknown) => {
        this.snackBar.error(err, 'Failed to load balance');
        return EMPTY;
      }),
    ),
  );

  readonly canSetUpBalance = computed(() => {
    const user = this.user();
    return user !== undefined && user.balanceSetUpAt === undefined;
  });

  setUpBalance(): void {
    const current = this.user()?.balance ?? 0;
    this.dialog
      .open<BalanceSetupDialog, number, number>(BalanceSetupDialog, { data: current, width: '400px' })
      .afterClosed()
      .pipe(
        filter((amount): amount is number => amount !== undefined),
        switchMap((amount) =>
          this.confirmService
            .ask({
              title: 'Set up balance',
              message:
                `Your balance changes from ${MONEY_FORMAT.format(current)} ₴ to ${MONEY_FORMAT.format(amount)} ₴. ` +
                'You can set up the balance only once, until the database is purged.',
              confirmText: 'Set balance',
              cancelText: 'Cancel',
            })
            .pipe(map(() => amount)),
        ),
        switchMap((amount) => from(this.userService.setUpBalance(amount)).pipe(map(() => amount))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (amount) => {
          this.snackBar.show(`Balance set to ${MONEY_FORMAT.format(amount)} ₴.`);
        },
        error: (e: unknown) => {
          this.snackBar.error(e, 'Failed to set up the balance.');
        },
      });
  }

  confirmPurge(): void {
    this.confirmService
      .ask({
        title: 'Purge database',
        message: 'This permanently deletes all your data and restores the defaults. It cannot be undone.',
        confirmText: 'Purge',
        cancelText: 'Cancel',
        isDestructive: true,
      })
      .pipe(
        switchMap(() => from(this.purgeService.purge())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.snackBar.show('Database purged.');
          void this.router.navigate(['/']);
        },
        error: (e: unknown) => {
          this.snackBar.error(e, 'Failed to purge database.');
        },
      });
  }
}
