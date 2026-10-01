import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EMPTY, catchError, from, switchMap } from 'rxjs';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';

@Component({
  selector: 'app-timer-controls',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './timer-controls.html',
  styleUrl: './timer-controls.scss',
})
export class TimerControls {
  private timerService = inject(PomodoroTimerService);
  private confirmService = inject(ConfirmService);
  private destroyRef = inject(DestroyRef);

  isActive = this.timerService.isActive;
  isRestoring = this.timerService.isRestoring;

  async start(): Promise<void> {
    try {
      await this.timerService.startTimer();
    } catch (e) {
      console.error(e);
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
              console.error(e);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
