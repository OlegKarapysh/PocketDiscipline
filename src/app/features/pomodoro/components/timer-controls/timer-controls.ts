import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EMPTY, catchError, from, switchMap } from 'rxjs';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { Amount } from '../../../../shared/components/amount/amount';
import { Badge } from '../../../../shared/components/badge/badge';

@Component({
  selector: 'app-timer-controls',
  imports: [Amount, Badge, MatButtonModule, MatIconModule],
  templateUrl: './timer-controls.html',
  styleUrl: './timer-controls.scss',
})
export class TimerControls {
  private timerService = inject(PomodoroTimerService);
  private confirmService = inject(ConfirmService);
  private snackBar = inject(SnackBarService);
  private destroyRef = inject(DestroyRef);

  isActive = this.timerService.isActive;
  isRestoring = this.timerService.isRestoring;
  reward = this.timerService.reward;

  async start(): Promise<void> {
    try {
      await this.timerService.startTimer();
    } catch (e) {
      this.snackBar.error(e, 'Could not start the session.');
    }
  }

  // Stop replaces Start in the same spot, so the second tap of a double tap on Start lands on it.
  // Stopping forfeits the reward, so it has to be confirmed.
  stop(): void {
    this.confirmService
      .ask({
        title: 'Stop this session?',
        message: 'It will be cancelled and will not earn a reward.',
        confirmText: 'Stop session',
        cancelText: 'Keep going',
        isDestructive: true,
      })
      .pipe(
        switchMap(() =>
          from(this.timerService.stopTimer()).pipe(
            catchError((e: unknown) => {
              this.snackBar.error(e, 'Could not stop the session.');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
