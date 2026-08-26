import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';

@Component({
  selector: 'app-timer-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timer-display">
      <div class="time">{{ formattedTime() }}</div>
      <div class="status" [class.active]="isActive()">
        {{ isActive() ? 'Focusing on ' + engagementType() : 'Ready to start' }}
      </div>
    </div>
  `,
  styles: [`
    .timer-display {
      text-align: center;
      padding: 2rem;
    }
    .time {
      font-size: 5rem;
      font-family: monospace;
      font-weight: bold;
      line-height: 1;
    }
    .status {
      margin-top: 1rem;
      font-size: 1.2rem;
      color: #666;
    }
    .status.active {
      color: #e91e63;
      font-weight: bold;
    }
  `]
})
export class TimerDisplay {
  private timerService = inject(PomodoroTimerService);

  isActive = this.timerService.isActive;
  engagementType = this.timerService.engagementType;
  
  formattedTime = computed(() => {
    const totalSeconds = this.timerService.timeRemaining();
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });
}
