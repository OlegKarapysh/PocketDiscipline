import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';

@Component({
  selector: 'app-timer-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="controls">
      @if (!isActive()) {
        <button mat-fab color="primary" (click)="start()" aria-label="Start Timer">
          <mat-icon>play_arrow</mat-icon>
        </button>
      } @else {
        <button mat-fab color="warn" (click)="stop()" aria-label="Stop Timer">
          <mat-icon>stop</mat-icon>
        </button>
      }
    </div>
  `,
  styles: [`
    .controls {
      display: flex;
      justify-content: center;
      gap: 1rem;
      padding: 1rem;
    }
  `]
})
export class TimerControls {
  private timerService = inject(PomodoroTimerService);

  isActive = this.timerService.isActive;

  start() {
    this.timerService.startTimer();
  }

  stop() {
    this.timerService.stopTimer();
  }
}
