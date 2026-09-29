import { Component, computed, inject } from '@angular/core';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';

@Component({
  selector: 'app-timer-display',
  imports: [],
  templateUrl: './timer-display.html',
  styleUrl: './timer-display.scss',
})
export class TimerDisplay {
  private timerService = inject(PomodoroTimerService);

  isActive = this.timerService.isActive;
  engagementType = this.timerService.engagementType;

  statusText = computed(() => {
    return this.isActive() ? `Focusing on ${this.engagementType()}` : 'Ready to start';
  });

  formattedTime = computed(() => {
    const totalSeconds = this.timerService.timeRemaining();
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });
}
