import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';
import { EngagementType } from '../../models/engagement-type.enum';

const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 120;
const DURATION_STEP_MINUTES = 5;

@Component({
  selector: 'app-session-config',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './session-config.html',
  styleUrl: './session-config.scss',
})
export class SessionConfig {
  private timerService = inject(PomodoroTimerService);

  readonly minDuration = MIN_DURATION_MINUTES;
  readonly maxDuration = MAX_DURATION_MINUTES;
  readonly stepDuration = DURATION_STEP_MINUTES;
  readonly engagementTypeWork = EngagementType.WORK;
  readonly engagementTypeStudy = EngagementType.STUDY;

  isActive = this.timerService.isActive;
  duration = this.timerService.durationMinutes;
  engagementType = this.timerService.engagementType;

  updateDuration(val: number) {
    if (val >= MIN_DURATION_MINUTES && val <= MAX_DURATION_MINUTES) {
      this.timerService.setConfig({
        durationMinutes: val,
        engagementType: this.engagementType(),
      });
    }
  }

  updateEngagement(val: EngagementType) {
    this.timerService.setConfig({
      durationMinutes: this.duration(),
      engagementType: val,
    });
  }
}
