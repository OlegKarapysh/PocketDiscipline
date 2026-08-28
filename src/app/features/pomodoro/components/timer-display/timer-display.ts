import { Component, computed, inject } from '@angular/core';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';

const SECONDS_IN_MINUTE = 60;
const TIME_PAD_LENGTH = 2;
const TIME_PAD_CHAR = '0';
const STATUS_READY = 'Ready to start';
const STATUS_FOCUSING_PREFIX = 'Focusing on ';

@Component({
  selector: 'app-timer-display',
  standalone: true,
  imports: [],
  templateUrl: './timer-display.html',
  styleUrl: './timer-display.scss',
})
export class TimerDisplay {
  private timerService = inject(PomodoroTimerService);

  isActive = this.timerService.isActive;
  engagementType = this.timerService.engagementType;

  statusText = computed(() => {
    return this.isActive() ? `${STATUS_FOCUSING_PREFIX}${this.engagementType()}` : STATUS_READY;
  });

  formattedTime = computed(() => {
    const totalSeconds = this.timerService.timeRemaining();
    const minutes = Math.floor(totalSeconds / SECONDS_IN_MINUTE);
    const seconds = totalSeconds % SECONDS_IN_MINUTE;
    const formattedMin = minutes.toString().padStart(TIME_PAD_LENGTH, TIME_PAD_CHAR);
    const formattedSec = seconds.toString().padStart(TIME_PAD_LENGTH, TIME_PAD_CHAR);
    return `${formattedMin}:${formattedSec}`;
  });
}
