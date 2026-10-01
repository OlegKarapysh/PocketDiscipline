import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { from, switchMap } from 'rxjs';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { ConfirmService } from '../../shared/services/confirm.service';
import { SnackBarService } from '../../shared/services/snack-bar.service';
import { DatabasePurgeService } from './services/database-purge.service';

@Component({
  imports: [RouterLink, MatButtonModule, MatIconModule, PageHeader],
  selector: 'app-settings',
  styleUrl: './settings.scss',
  templateUrl: './settings.html',
})
export class Settings {
  private confirmService = inject(ConfirmService);
  private purgeService = inject(DatabasePurgeService);
  private snackBar = inject(SnackBarService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

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
