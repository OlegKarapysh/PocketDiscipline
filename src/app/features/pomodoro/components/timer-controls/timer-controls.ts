import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';

@Component({
  selector: 'app-timer-controls',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './timer-controls.html',
  styleUrl: './timer-controls.scss',
})
export class TimerControls {
  private timerService = inject(PomodoroTimerService);

  isActive = this.timerService.isActive;

  async start(): Promise<void> {
    try {
      await this.timerService.startTimer();
    } catch (e) {
      console.error(e);
    }
  }

  async stop(): Promise<void> {
    try {
      await this.timerService.stopTimer();
    } catch (e) {
      console.error(e);
    }
  }
}

